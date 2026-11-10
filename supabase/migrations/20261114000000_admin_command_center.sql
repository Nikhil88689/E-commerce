create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'super_admin')),
  created_at timestamptz not null default now()
);
alter table public.admin_roles enable row level security;
drop policy if exists "Users can read their own admin role" on public.admin_roles;
create policy "Users can read their own admin role" on public.admin_roles
  for select to authenticated using (auth.uid() = user_id);
grant select on public.admin_roles to authenticated;
revoke insert, update, delete on public.admin_roles from anon, authenticated;

create or replace function public.is_vanta_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid());
$$;
revoke all on function public.is_vanta_admin() from public, anon;
grant execute on function public.is_vanta_admin() to authenticated, service_role;

alter table public.products add column if not exists model_url text;
alter table public.products add column if not exists is_featured boolean not null default false;
update public.products set is_featured = true where is_published and featured_rank <= 4 and not is_featured;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  name text not null,
  options jsonb not null default '{}'::jsonb,
  price_adjustment_cents integer not null default 0,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists product_variants_product_idx on public.product_variants(product_id, sort_order);
alter table public.product_variants enable row level security;
create policy "Public can read variants for published products" on public.product_variants
  for select to anon, authenticated using (exists (select 1 from public.products where products.id = product_variants.product_id and products.is_published));
create policy "VANTA admins can manage product variants" on public.product_variants
  for all to authenticated using (public.is_vanta_admin()) with check (public.is_vanta_admin());
grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  sku text,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null,
  reference text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists inventory_movements_created_idx on public.inventory_movements(created_at desc);
alter table public.inventory_movements enable row level security;
create policy "VANTA admins can read inventory history" on public.inventory_movements
  for select to authenticated using (public.is_vanta_admin());
grant select on public.inventory_movements to authenticated;

create or replace function public.sync_product_stock_from_variants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product_id uuid;
begin
  v_product_id := coalesce(new.product_id, old.product_id);
  update public.products
    set stock_quantity = coalesce((select sum(stock_quantity)::integer from public.product_variants where product_id = v_product_id and is_active), 0),
        updated_at = now()
    where id = v_product_id;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.sync_product_stock_from_variants() from public, anon, authenticated;
drop trigger if exists product_variants_sync_stock on public.product_variants;
create trigger product_variants_sync_stock
  after insert or update or delete on public.product_variants
  for each row execute function public.sync_product_stock_from_variants();

create or replace function public.admin_adjust_inventory(
  p_product_id uuid,
  p_variant_id uuid,
  p_delta integer,
  p_reason text,
  p_reference text,
  p_actor uuid
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_quantity integer;
begin
  if p_delta = 0 or length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'A non-zero adjustment and reason are required.' using errcode = '22023';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'Product not found.' using errcode = 'P0002'; end if;

  if p_variant_id is not null then
    select * into v_variant from public.product_variants where id = p_variant_id and product_id = p_product_id for update;
    if not found then raise exception 'Variant not found for product.' using errcode = 'P0002'; end if;
    v_quantity := v_variant.stock_quantity + p_delta;
    if v_quantity < 0 then raise exception 'Inventory cannot become negative.' using errcode = '22023'; end if;
    update public.product_variants set stock_quantity = v_quantity, updated_at = now() where id = p_variant_id;
  else
    v_quantity := v_product.stock_quantity + p_delta;
    if v_quantity < 0 then raise exception 'Inventory cannot become negative.' using errcode = '22023'; end if;
    update public.products set stock_quantity = v_quantity, updated_at = now() where id = p_product_id;
  end if;

  insert into public.inventory_movements(product_id, variant_id, product_name, sku, quantity_delta, reason, reference, created_by)
  values (p_product_id, p_variant_id, v_product.name, case when p_variant_id is not null then v_variant.sku else null end, p_delta, trim(p_reason), nullif(trim(coalesce(p_reference, '')), ''), p_actor);
  return v_quantity;
end;
$$;
revoke all on function public.admin_adjust_inventory(uuid, uuid, integer, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_adjust_inventory(uuid, uuid, integer, text, text, uuid) to service_role;

create or replace function public.admin_save_product(p_id uuid, p_product jsonb, p_variants jsonb, p_actor uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_variant jsonb;
  v_variant_id uuid;
  v_variant_ids uuid[] := '{}';
  v_old_variant_stock integer;
  v_variant_stock integer;
  v_variant_exists boolean;
  v_old_product_stock integer := 0;
  v_original_variant_count integer := 0;
  v_final_product_stock integer := 0;
  v_removed_variant record;
begin
  if jsonb_typeof(p_variants) <> 'array' then
    raise exception 'Product variants must be an array.' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.products (
      slug, name, description, story, category_slug, images, image_alt, materials,
      colors, color_swatches, price_cents, sale_price_cents, stock_quantity,
      collection_slug, collection_name, is_published, is_featured, featured_rank, model_url
    ) values (
      p_product->>'slug', p_product->>'name', p_product->>'description', coalesce(p_product->>'story', ''), p_product->>'category_slug',
      array(select jsonb_array_elements_text(p_product->'images')), p_product->>'image_alt',
      array(select jsonb_array_elements_text(p_product->'materials')),
      array(select color->>'name' from jsonb_array_elements(p_product->'color_swatches') color), p_product->'color_swatches',
      (p_product->>'price_cents')::integer, nullif(p_product->>'sale_price_cents', '')::integer,
      (p_product->>'stock_quantity')::integer, p_product->>'collection_slug', p_product->>'collection_name',
      (p_product->>'is_published')::boolean, (p_product->>'is_featured')::boolean,
      (p_product->>'featured_rank')::integer, nullif(p_product->>'model_url', '')
    ) returning id into v_id;
    v_old_product_stock := 0;
  else
    select stock_quantity into v_old_product_stock from public.products where id = p_id for update;
    if not found then raise exception 'Product not found.' using errcode = 'P0002'; end if;
    select count(*)::integer into v_original_variant_count from public.product_variants where product_id = p_id;
    update public.products set
      slug = p_product->>'slug', name = p_product->>'name', description = p_product->>'description', story = coalesce(p_product->>'story', ''),
      category_slug = p_product->>'category_slug', images = array(select jsonb_array_elements_text(p_product->'images')),
      image_alt = p_product->>'image_alt', materials = array(select jsonb_array_elements_text(p_product->'materials')),
      colors = array(select color->>'name' from jsonb_array_elements(p_product->'color_swatches') color), color_swatches = p_product->'color_swatches',
      price_cents = (p_product->>'price_cents')::integer, sale_price_cents = nullif(p_product->>'sale_price_cents', '')::integer,
      stock_quantity = (p_product->>'stock_quantity')::integer, collection_slug = p_product->>'collection_slug',
      collection_name = p_product->>'collection_name', is_published = (p_product->>'is_published')::boolean,
      is_featured = (p_product->>'is_featured')::boolean, featured_rank = (p_product->>'featured_rank')::integer,
      model_url = nullif(p_product->>'model_url', ''), updated_at = now()
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Product not found.' using errcode = 'P0002'; end if;
  end if;

  for v_variant in select value from jsonb_array_elements(p_variants)
  loop
    v_variant_id := nullif(v_variant->>'id', '')::uuid;
    v_variant_exists := false;
    v_old_variant_stock := 0;
    if v_variant_id is null then v_variant_id := gen_random_uuid();
    else
      select stock_quantity into v_old_variant_stock from public.product_variants where id = v_variant_id and product_id = v_id;
      v_variant_exists := found;
      if not v_variant_exists then raise exception 'A variant does not belong to this product.' using errcode = '22023'; end if;
    end if;
    v_variant_stock := (v_variant->>'stock_quantity')::integer;
    v_variant_ids := array_append(v_variant_ids, v_variant_id);
    insert into public.product_variants (id, product_id, sku, name, options, price_adjustment_cents, stock_quantity, is_active, sort_order, updated_at)
    values (v_variant_id, v_id, v_variant->>'sku', v_variant->>'name', coalesce(v_variant->'options', '{}'::jsonb),
      coalesce((v_variant->>'price_adjustment_cents')::integer, 0), (v_variant->>'stock_quantity')::integer,
      coalesce((v_variant->>'is_active')::boolean, true), coalesce((v_variant->>'sort_order')::integer, 0), now())
    on conflict (id) do update set sku=excluded.sku, name=excluded.name, options=excluded.options,
      price_adjustment_cents=excluded.price_adjustment_cents, stock_quantity=excluded.stock_quantity,
      is_active=excluded.is_active, sort_order=excluded.sort_order, updated_at=now();
    if v_variant_stock <> v_old_variant_stock and (v_variant_exists or p_id is null or v_original_variant_count > 0) then
      insert into public.inventory_movements(product_id, variant_id, product_name, sku, quantity_delta, reason, created_by)
      values (v_id, v_variant_id, p_product->>'name', v_variant->>'sku', v_variant_stock - v_old_variant_stock,
        case when v_variant_exists then 'Product editor stock change' else 'Variant initial stock' end, p_actor);
    end if;
  end loop;

  if jsonb_array_length(p_variants) > 0 then
    for v_removed_variant in
      select id, sku, stock_quantity from public.product_variants where product_id = v_id and not (id = any(v_variant_ids))
    loop
      if v_removed_variant.stock_quantity > 0 then
        insert into public.inventory_movements(product_id, variant_id, product_name, sku, quantity_delta, reason, created_by)
        values (v_id, v_removed_variant.id, p_product->>'name', v_removed_variant.sku, -v_removed_variant.stock_quantity, 'Variant removed', p_actor);
      end if;
    end loop;
  end if;
  delete from public.product_variants where product_id = v_id and not (id = any(v_variant_ids));
  if p_id is not null and v_original_variant_count = 0 and jsonb_array_length(p_variants) > 0 then
    select stock_quantity into v_final_product_stock from public.products where id = v_id;
    if v_final_product_stock <> v_old_product_stock then
      insert into public.inventory_movements(product_id, product_name, quantity_delta, reason, created_by)
      values (v_id, p_product->>'name', v_final_product_stock - v_old_product_stock, 'Product editor stock change', p_actor);
    end if;
  end if;
  if jsonb_array_length(p_variants) = 0 then
    update public.products set stock_quantity = (p_product->>'stock_quantity')::integer where id = v_id;
    select stock_quantity into v_variant_stock from public.products where id = v_id;
    if v_variant_stock <> v_old_product_stock then
      insert into public.inventory_movements(product_id, product_name, quantity_delta, reason, created_by)
      values (v_id, p_product->>'name', v_variant_stock - v_old_product_stock,
        case when p_id is null then 'Product initial stock' else 'Product editor stock change' end, p_actor);
    end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.admin_save_product(uuid, jsonb, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.admin_save_product(uuid, jsonb, jsonb, uuid) to service_role;

create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  description text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_created_idx on public.order_events(order_id, created_at);
alter table public.order_events enable row level security;
create policy "Customers can read their order events" on public.order_events for select to authenticated
  using (exists (select 1 from public.orders where orders.id = order_events.order_id and orders.user_id = auth.uid()));
create policy "VANTA admins can read order events" on public.order_events for select to authenticated using (public.is_vanta_admin());
grant select on public.order_events to authenticated;

create or replace function public.admin_update_fulfillment(
  p_order_id uuid, p_status text, p_carrier text, p_tracking_number text,
  p_tracking_url text, p_note text, p_actor uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
     or length(trim(coalesce(p_note, ''))) < 3 then
    raise exception 'A valid fulfillment status and history note are required.' using errcode = '22023';
  end if;
  update public.orders set
    fulfillment_status = p_status,
    shipment_carrier = nullif(trim(coalesce(p_carrier, '')), ''),
    tracking_number = nullif(trim(coalesce(p_tracking_number, '')), ''),
    tracking_url = nullif(trim(coalesce(p_tracking_url, '')), ''),
    shipped_at = case when p_status = 'shipped' then coalesce(shipped_at, now()) else shipped_at end,
    delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
    cancelled_at = case when p_status = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
    updated_at = now()
  where id = p_order_id;
  if not found then return false; end if;
  insert into public.order_events(order_id, event_type, description, created_by)
    values (p_order_id, p_status, trim(p_note), p_actor);
  return true;
end;
$$;
revoke all on function public.admin_update_fulfillment(uuid, text, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_update_fulfillment(uuid, text, text, text, text, text, uuid) to service_role;

create table if not exists public.homepage_sections (
  section_key text primary key check (section_key ~ '^[a-z0-9_-]+$'),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.homepage_sections enable row level security;
create policy "Public can read enabled homepage sections" on public.homepage_sections
  for select to anon, authenticated using (enabled);
create policy "VANTA admins can manage homepage sections" on public.homepage_sections
  for all to authenticated using (public.is_vanta_admin()) with check (public.is_vanta_admin());
grant select on public.homepage_sections to anon, authenticated;
grant insert, update, delete on public.homepage_sections to authenticated;

create or replace function public.get_public_homepage_sections()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_object_agg(section_key,
    case when enabled then jsonb_build_object('title', title, 'content', content, 'enabled', true, 'sortOrder', sort_order)
    else jsonb_build_object('enabled', false) end
  ), '{}'::jsonb)
  from public.homepage_sections;
$$;
revoke all on function public.get_public_homepage_sections() from public;
grant execute on function public.get_public_homepage_sections() to anon, authenticated;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  session_key text not null,
  event_type text not null check (event_type in ('page_view', 'product_view', 'add_to_cart', 'checkout_started', 'purchase')),
  page_path text not null,
  product_slug text,
  order_id uuid references public.orders(id) on delete set null,
  occurred_at timestamptz not null default now()
);
create index if not exists analytics_events_created_type_idx on public.analytics_events(occurred_at desc, event_type);
create index if not exists analytics_events_session_idx on public.analytics_events(session_key, occurred_at);
alter table public.analytics_events enable row level security;
create policy "Visitors can record minimal analytics events" on public.analytics_events for insert to anon, authenticated
  with check (event_type <> 'purchase' and order_id is null and length(session_key) between 12 and 80 and length(page_path) between 1 and 300);
create policy "VANTA admins can read analytics events" on public.analytics_events for select to authenticated using (public.is_vanta_admin());
grant insert (event_key, session_key, event_type, page_path, product_slug, order_id, occurred_at) on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;

create or replace function public.admin_dashboard_metrics()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with paid_orders as (
    select id, total_cents, currency, created_at
    from public.orders
    where payment_status = 'paid'
  ),
  product_sales as (
    select oi.product_slug, max(oi.product_name) as name,
      sum(oi.quantity)::bigint as units,
      sum(oi.quantity * oi.unit_amount_cents)::bigint as "revenueCents"
    from public.order_items oi
    join paid_orders po on po.id = oi.order_id
    group by oi.product_slug
  ),
  category_sales as (
    select coalesce(p.category_slug, 'uncategorized') as category,
      sum(oi.quantity)::bigint as units,
      sum(oi.quantity * oi.unit_amount_cents)::bigint as "revenueCents"
    from public.order_items oi
    join paid_orders po on po.id = oi.order_id
    left join public.products p on p.slug = oi.product_slug
    group by coalesce(p.category_slug, 'uncategorized')
  ),
  daily_revenue as (
    select (created_at at time zone 'UTC')::date as day,
      sum(total_cents)::bigint as revenue_cents,
      count(*)::integer as orders
    from paid_orders
    where created_at >= (current_date - 29)::timestamptz
    group by (created_at at time zone 'UTC')::date
  ),
  daily_inventory as (
    select (created_at at time zone 'UTC')::date as day,
      sum(quantity_delta)::integer as net,
      sum(greatest(quantity_delta, 0))::integer as received,
      sum(least(quantity_delta, 0))::integer as removed
    from public.inventory_movements
    where created_at >= (current_date - 29)::timestamptz
    group by (created_at at time zone 'UTC')::date
  ),
  page_sessions as (
    select count(distinct session_key)::integer as sessions
    from public.analytics_events
    where event_type = 'page_view' and occurred_at >= now() - interval '30 days'
  ),
  checkout_sessions as (
    select count(distinct session_key)::integer as sessions
    from public.analytics_events
    where event_type = 'checkout_started' and occurred_at >= now() - interval '30 days'
  ),
  purchase_sessions as (
    select count(distinct session_key)::integer as sessions
    from public.analytics_events
    where event_type = 'purchase' and occurred_at >= now() - interval '30 days'
  )
  select jsonb_build_object(
    'revenueCents', coalesce((select sum(total_cents)::bigint from paid_orders), 0),
    'paidOrders', (select count(*)::integer from paid_orders),
    'totalOrders', (select count(*)::integer from public.orders),
    'averageOrderValueCents', coalesce((select round(avg(total_cents))::bigint from paid_orders), 0),
    'customers', (select count(*)::integer from public.profiles),
    'inventoryAlerts', coalesce((select jsonb_agg(to_jsonb(alerts)) from (
      select id, slug, name, category_slug, stock_quantity, is_published
      from public.products where stock_quantity <= 4 order by stock_quantity asc limit 8
    ) alerts), '[]'::jsonb),
    'recentOrders', coalesce((select jsonb_agg(to_jsonb(recent)) from (
      select id, order_number, email, user_id, total_cents, currency, payment_status, fulfillment_status, created_at
      from public.orders order by created_at desc limit 6
    ) recent), '[]'::jsonb),
    'trend', coalesce((select jsonb_agg(jsonb_build_object(
      'date', to_char(days.day::date, 'YYYY-MM-DD'),
      'revenueCents', coalesce(revenue.revenue_cents, 0),
      'orders', coalesce(revenue.orders, 0)
    ) order by days.day) from generate_series((current_date - 29)::timestamp, current_date::timestamp, interval '1 day') days(day)
      left join daily_revenue revenue on revenue.day = days.day::date), '[]'::jsonb),
    'inventoryTrend', coalesce((select jsonb_agg(jsonb_build_object(
      'date', to_char(days.day::date, 'YYYY-MM-DD'),
      'net', coalesce(movement.net, 0),
      'received', coalesce(movement.received, 0),
      'removed', coalesce(movement.removed, 0)
    ) order by days.day) from generate_series((current_date - 29)::timestamp, current_date::timestamp, interval '1 day') days(day)
      left join daily_inventory movement on movement.day = days.day::date), '[]'::jsonb),
    'bestSellers', coalesce((select jsonb_agg(to_jsonb(best)) from (
      select product_slug as slug, name, units, "revenueCents" from product_sales order by units desc limit 6
    ) best), '[]'::jsonb),
    'categorySales', coalesce((select jsonb_agg(to_jsonb(category)) from (
      select category, units, "revenueCents" from category_sales order by "revenueCents" desc
    ) category), '[]'::jsonb),
    'conversion', (select case when page_sessions.sessions = 0 then null else jsonb_build_object(
      'sessions', page_sessions.sessions,
      'checkoutSessions', checkout_sessions.sessions,
      'purchases', purchase_sessions.sessions,
      'purchaseRate', purchase_sessions.sessions::numeric / page_sessions.sessions
    ) end from page_sessions cross join checkout_sessions cross join purchase_sessions)
  );
$$;
revoke all on function public.admin_dashboard_metrics() from public, anon, authenticated;
grant execute on function public.admin_dashboard_metrics() to service_role;

insert into public.homepage_sections(section_key, title, content, enabled, sort_order)
values
  ('featured', 'Selected directions', '{"headline":"Ideas in form.","description":"These are visual studies, not products for sale. No prices or release dates have been set."}'::jsonb, true, 1),
  ('collections', 'Find your point of view', '{"headline":"Enter a world.","description":"Five lenses on modern life. Choose one to filter the concept archive.","campaignHeadline":"Objects for the elsewhere.","campaignDescription":"A shared direction across sound, space, movement, and light. Presented as concepts while the first VANTA collection takes shape."}'::jsonb, true, 2),
  ('drops', 'The release signal', '{"headline":"Nothing drops until it is ready.","description":"No release is scheduled. We will share a date here only when one is confirmed."}'::jsonb, true, 3),
  ('stories', 'A note on becoming', '{"headline":"The VANTA story","statement":"Not more things. More meaning in the things we choose.","description":"We are building a space for considered design: where each object begins with a question, and each answer leaves room for another."}'::jsonb, true, 4)
on conflict (section_key) do nothing;

drop policy if exists "VANTA admins can manage products" on public.products;
create policy "VANTA admins can manage products" on public.products for all to authenticated
  using (public.is_vanta_admin()) with check (public.is_vanta_admin());
drop policy if exists "VANTA admins can manage categories" on public.categories;
create policy "VANTA admins can manage categories" on public.categories for all to authenticated
  using (public.is_vanta_admin()) with check (public.is_vanta_admin());
drop policy if exists "VANTA admins can manage collections" on public.collections;
create policy "VANTA admins can manage collections" on public.collections for all to authenticated
  using (public.is_vanta_admin()) with check (public.is_vanta_admin());
drop policy if exists "VANTA admins can manage drops" on public.drops;
create policy "VANTA admins can manage drops" on public.drops for all to authenticated
  using (public.is_vanta_admin()) with check (public.is_vanta_admin());
drop policy if exists "VANTA admins can manage stories" on public.stories;
create policy "VANTA admins can manage stories" on public.stories for all to authenticated
  using (public.is_vanta_admin()) with check (public.is_vanta_admin());
drop policy if exists "VANTA admins can manage discounts" on public.discounts;
create policy "VANTA admins can manage discounts" on public.discounts for all to authenticated
  using (public.is_vanta_admin()) with check (public.is_vanta_admin());
drop policy if exists "VANTA admins can read all orders" on public.orders;
create policy "VANTA admins can read all orders" on public.orders for select to authenticated using (public.is_vanta_admin());
drop policy if exists "VANTA admins can update orders" on public.orders;
create policy "VANTA admins can update orders" on public.orders for update to authenticated using (public.is_vanta_admin()) with check (public.is_vanta_admin());
drop policy if exists "VANTA admins can read all order items" on public.order_items;
create policy "VANTA admins can read all order items" on public.order_items for select to authenticated using (public.is_vanta_admin());
drop policy if exists "VANTA admins can read payments" on public.payments;
create policy "VANTA admins can read payments" on public.payments for select to authenticated using (public.is_vanta_admin());
drop policy if exists "VANTA admins can read saved addresses" on public.addresses;
create policy "VANTA admins can read saved addresses" on public.addresses for select to authenticated using (public.is_vanta_admin());
drop policy if exists "VANTA admins can read customer profiles" on public.profiles;
create policy "VANTA admins can read customer profiles" on public.profiles for select to authenticated using (public.is_vanta_admin());
drop policy if exists "VANTA admins can update customer profiles" on public.profiles;
create policy "VANTA admins can update customer profiles" on public.profiles for update to authenticated using (public.is_vanta_admin()) with check (public.is_vanta_admin());
drop policy if exists "VANTA admins can read customer wishlists" on public.wishlist_items;
create policy "VANTA admins can read customer wishlists" on public.wishlist_items for select to authenticated using (public.is_vanta_admin());
drop policy if exists "VANTA admins can read saved configurations" on public.saved_configurations;
create policy "VANTA admins can read saved configurations" on public.saved_configurations for select to authenticated using (public.is_vanta_admin());
drop policy if exists "VANTA admins can read drop notification requests" on public.drop_notifications;
create policy "VANTA admins can read drop notification requests" on public.drop_notifications for select to authenticated using (public.is_vanta_admin());

grant select on public.products, public.categories to anon, authenticated;
grant insert, update, delete on public.products, public.categories, public.collections, public.drops, public.stories, public.discounts, public.homepage_sections to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.order_items, public.payments, public.addresses, public.profiles, public.wishlist_items, public.saved_configurations, public.drop_notifications, public.order_events, public.inventory_movements, public.analytics_events to authenticated;
grant select, insert, update, delete on public.product_variants to authenticated;
grant all on public.admin_roles, public.product_variants, public.inventory_movements, public.order_events, public.homepage_sections, public.analytics_events, public.products, public.categories, public.collections, public.drops, public.stories, public.discounts, public.orders, public.order_items, public.payments, public.addresses, public.profiles, public.wishlist_items, public.saved_configurations, public.drop_notifications to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('vanta-product-media', 'vanta-product-media', true, 52428800, array['image/jpeg','image/png','image/webp','image/avif','model/gltf-binary','model/gltf+json','application/octet-stream'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "VANTA admins can upload product media" on storage.objects;
create policy "VANTA admins can upload product media" on storage.objects for insert to authenticated
  with check (bucket_id = 'vanta-product-media' and public.is_vanta_admin());
drop policy if exists "VANTA admins can update product media" on storage.objects;
create policy "VANTA admins can update product media" on storage.objects for update to authenticated
  using (bucket_id = 'vanta-product-media' and public.is_vanta_admin()) with check (bucket_id = 'vanta-product-media' and public.is_vanta_admin());
drop policy if exists "VANTA admins can delete product media" on storage.objects;
create policy "VANTA admins can delete product media" on storage.objects for delete to authenticated
  using (bucket_id = 'vanta-product-media' and public.is_vanta_admin());

comment on table public.admin_roles is 'Admin grants are assigned out of band; authenticated users cannot grant themselves access.';
comment on table public.inventory_movements is 'Immutable stock adjustment history recorded by the admin adjustment function.';
comment on table public.analytics_events is 'Minimal event records used only when storefront analytics tracking is enabled.';
