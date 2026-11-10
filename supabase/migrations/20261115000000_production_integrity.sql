-- Production integrity hardening. This migration is additive and safe to apply
-- after the catalog, checkout, customer, editorial and admin migrations.

-- Normalize public access to discounts: active codes remain redeemable through
-- a narrow RPC, while usage counts and redemption limits stay server side.
drop policy if exists "Public can inspect active discount codes" on public.discounts;
revoke select on public.discounts from public, anon, authenticated;

create table if not exists public.discount_reservations (
  order_id uuid primary key references public.orders(id) on delete cascade,
  discount_id uuid not null references public.discounts(id) on delete restrict,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists discount_reservations_discount_expiry_idx
  on public.discount_reservations(discount_id, expires_at);
alter table public.discount_reservations enable row level security;
revoke all on public.discount_reservations from public, anon, authenticated;

create or replace function public.get_public_discount(p_code text)
returns table (
  id uuid,
  code text,
  discount_type text,
  amount integer,
  minimum_subtotal_cents integer,
  maximum_discount_cents integer,
  starts_at timestamptz,
  expires_at timestamptz,
  available boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select d.id, d.code, d.discount_type, d.amount, d.minimum_subtotal_cents,
    d.maximum_discount_cents, d.starts_at, d.expires_at,
    (d.active and (d.starts_at is null or d.starts_at <= now())
      and (d.expires_at is null or d.expires_at > now())
      and (d.usage_limit is null or d.usage_count + (
        select count(*) from public.discount_reservations r
        where r.discount_id = d.id and r.expires_at > now()
      ) < d.usage_limit)) as available
  from public.discounts d
  where length(trim(coalesce(p_code, ''))) between 3 and 40
    and d.code = upper(trim(p_code))
  limit 1;
$$;
revoke all on function public.get_public_discount(text) from public;
grant execute on function public.get_public_discount(text) to anon, authenticated, service_role;

-- Public endpoints use fixed server-defined limits. Only a one-way IP digest is
-- persisted; callers cannot choose the quota or window.
create table if not exists public.rate_limit_counters (
  bucket text not null,
  key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (bucket, key_hash)
);
create index if not exists rate_limit_counters_window_idx on public.rate_limit_counters(window_started_at);
alter table public.rate_limit_counters enable row level security;
revoke all on public.rate_limit_counters from public, anon, authenticated;

create or replace function public.consume_public_rate_limit(p_bucket text, p_key_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit integer;
  v_window interval;
  v_count integer;
begin
  case p_bucket
    when 'checkout' then v_limit := 8; v_window := interval '10 minutes';
    when 'quote' then v_limit := 30; v_window := interval '10 minutes';
    when 'newsletter' then v_limit := 5; v_window := interval '1 hour';
    when 'drop-notify' then v_limit := 8; v_window := interval '1 hour';
    when 'search' then v_limit := 90; v_window := interval '1 minute';
    when 'cart' then v_limit := 60; v_window := interval '10 minutes';
    else raise exception 'Unsupported rate limit bucket.' using errcode = '22023';
  end case;
  if p_key_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid rate limit key.' using errcode = '22023';
  end if;

  insert into public.rate_limit_counters(bucket, key_hash, window_started_at, request_count)
  values (p_bucket, p_key_hash, now(), 1)
  on conflict (bucket, key_hash) do update set
    window_started_at = case
      when rate_limit_counters.window_started_at <= now() - v_window then now()
      else rate_limit_counters.window_started_at end,
    request_count = case
      when rate_limit_counters.window_started_at <= now() - v_window then 1
      else rate_limit_counters.request_count + 1 end
  returning request_count into v_count;
  return v_count <= v_limit;
end;
$$;
revoke all on function public.consume_public_rate_limit(text, text) from public;
grant execute on function public.consume_public_rate_limit(text, text) to service_role;
grant all on public.rate_limit_counters to service_role;

create or replace function public.replace_cart_items(p_cart_id uuid, p_items jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'Invalid cart item list.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 80 then
    raise exception 'Cart item limit exceeded.' using errcode = '22023';
  end if;
  perform 1 from public.carts where id = p_cart_id for update;
  if not found then raise exception 'Cart not found.' using errcode = 'P0002'; end if;
  delete from public.cart_items where cart_id = p_cart_id;
  insert into public.cart_items(cart_id, product_id, product_slug, variant_id, quantity, configuration, is_saved, updated_at)
  select p_cart_id,
    nullif(item->>'product_id', '')::uuid,
    item->>'product_slug', item->>'variant_id', (item->>'quantity')::integer,
    item->'configuration', coalesce((item->>'is_saved')::boolean, false), now()
  from jsonb_array_elements(p_items) as entries(item)
  where coalesce((item->>'quantity')::integer, 0) between 1 and 50
    and length(coalesce(item->>'product_slug', '')) between 1 and 160
    and length(coalesce(item->>'variant_id', '')) between 1 and 320
    and jsonb_typeof(item->'configuration') = 'object';
  if (select count(*) from public.cart_items where cart_id = p_cart_id) <> jsonb_array_length(p_items) then
    raise exception 'Cart contains an invalid item.' using errcode = '22023';
  end if;
  update public.carts set updated_at = now() where id = p_cart_id;
  return true;
end;
$$;
revoke all on function public.replace_cart_items(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_cart_items(uuid, jsonb) to service_role;
grant all on public.discount_reservations to service_role;

create index if not exists orders_payment_status_created_idx on public.orders(payment_status, created_at desc);
create index if not exists orders_fulfillment_status_created_idx on public.orders(fulfillment_status, created_at desc);
create index if not exists cart_items_cart_saved_updated_idx on public.cart_items(cart_id, is_saved, updated_at desc);
create unique index if not exists payments_stripe_intent_unique_idx
  on public.payments(stripe_payment_intent_id) where stripe_payment_intent_id is not null;
alter table public.orders add column if not exists cart_id uuid references public.carts(id) on delete set null;
create index if not exists orders_cart_idx on public.orders(cart_id) where cart_id is not null;

create table if not exists public.cart_order_consumptions (
  order_id uuid primary key references public.orders(id) on delete cascade,
  cart_id uuid not null references public.carts(id) on delete cascade,
  consumed_at timestamptz not null default now()
);
alter table public.cart_order_consumptions enable row level security;
revoke all on public.cart_order_consumptions from public, anon, authenticated;
grant all on public.cart_order_consumptions to service_role;

create or replace function public.remove_purchased_cart_items(p_order_id uuid, p_cart_id uuid, p_refs jsonb)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expected_cart_id uuid;
  v_ref record;
begin
  if jsonb_typeof(p_refs) <> 'array' then
    raise exception 'Invalid purchased cart references.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_refs) > 80 then
    raise exception 'Purchased cart reference limit exceeded.' using errcode = '22023';
  end if;
  select cart_id into v_expected_cart_id from public.orders where id = p_order_id for update;
  if not found or v_expected_cart_id is distinct from p_cart_id then
    raise exception 'Cart does not belong to this order.' using errcode = '22023';
  end if;
  insert into public.cart_order_consumptions(order_id, cart_id) values (p_order_id, p_cart_id)
    on conflict (order_id) do nothing;
  if not found then return true; end if;
  perform 1 from public.carts where id = p_cart_id for update;
  if not found then return true; end if;
  for v_ref in select item->>'variantId' as variant_id, (item->>'quantity')::integer as quantity
    from jsonb_array_elements(p_refs) as entries(item)
  loop
    if v_ref.variant_id is null or length(v_ref.variant_id) > 320 or v_ref.quantity < 1 then
      raise exception 'Invalid purchased cart reference.' using errcode = '22023';
    end if;
    delete from public.cart_items where cart_id = p_cart_id and variant_id = v_ref.variant_id
      and quantity <= v_ref.quantity;
    update public.cart_items set quantity = quantity - v_ref.quantity, updated_at = now()
      where cart_id = p_cart_id and variant_id = v_ref.variant_id and quantity > v_ref.quantity;
  end loop;
  update public.carts set updated_at = now() where id = p_cart_id;
  return true;
end;
$$;
revoke all on function public.remove_purchased_cart_items(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.remove_purchased_cart_items(uuid, uuid, jsonb) to service_role;

-- Products refer to a real editorial collection. RESTRICT preserves product
-- records and makes an admin remove/reassign their products before collection deletion.
update public.products
set collection_slug = 'edition-001', collection_name = 'Edition 001 / The first signal'
where collection_slug !~ '^[a-z0-9-]+$';

insert into public.collections(slug, name, eyebrow, description, statement, image_url, image_alt, categories, is_featured, sort_order, is_published)
select p.collection_slug,
  coalesce(max(nullif(p.collection_name, '')), p.collection_slug),
  'Catalog study', 'A collection record created while connecting existing VANTA catalog data.',
  'A shared direction across product forms.',
  coalesce(max(p.images[1]) filter (where p.images[1] like '/images/%'), '/images/concepts/object-concept.webp'),
  coalesce(max(nullif(p.image_alt, '')), 'VANTA collection study'),
  array_agg(distinct p.category_slug), false, 10000, bool_or(p.is_published)
from public.products p
left join public.collections c on c.slug = p.collection_slug
where c.slug is null and p.collection_slug ~ '^[a-z0-9-]+$'
group by p.collection_slug
on conflict (slug) do nothing;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_collection_slug_fkey' and conrelid = 'public.products'::regclass) then
    alter table public.products add constraint products_collection_slug_fkey
      foreign key (collection_slug) references public.collections(slug) on update cascade on delete restrict;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'product_variants_price_adjustment_range_check' and conrelid = 'public.product_variants'::regclass) then
    alter table public.product_variants add constraint product_variants_price_adjustment_range_check
      check (price_adjustment_cents between -100000 and 1000000);
  end if;
end $$;

-- Checkout reservations serialize against product stock changes and reserve an
-- exact admin variant when the configured options map to one.
create table if not exists public.order_inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null check (quantity > 0),
  status text not null default 'reserved' check (status in ('reserved', 'committed', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists order_inventory_product_line_unique_idx
  on public.order_inventory_reservations(order_item_id) where product_variant_id is null;
create unique index if not exists order_inventory_variant_line_unique_idx
  on public.order_inventory_reservations(order_item_id, product_variant_id) where product_variant_id is not null;
create index if not exists order_inventory_active_product_idx
  on public.order_inventory_reservations(product_id, product_variant_id, expires_at)
  where status = 'reserved';
create index if not exists order_inventory_order_status_idx
  on public.order_inventory_reservations(order_id, status);
alter table public.order_inventory_reservations enable row level security;
revoke all on public.order_inventory_reservations from public, anon, authenticated;
grant all on public.order_inventory_reservations to service_role;

create or replace function public.protect_reserved_inventory()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_held integer;
begin
  if tg_table_name = 'products' then
    if new.stock_quantity < old.stock_quantity then
      select coalesce(sum(quantity), 0)::integer into v_held
      from public.order_inventory_reservations
      where product_id = old.id and status = 'reserved' and expires_at > now();
      if new.stock_quantity < v_held then
        raise exception 'Product stock cannot be reduced below active checkout reservations.' using errcode = '23514';
      end if;
    end if;
    return new;
  end if;
  if tg_table_name = 'product_variants' then
    if tg_op = 'INSERT' then
      if exists(select 1 from public.order_inventory_reservations
        where product_id = new.product_id and product_variant_id is null
          and status = 'reserved' and expires_at > now()) then
        raise exception 'Variants cannot be added while product-level checkout reservations are active.' using errcode = '23514';
      end if;
      return new;
    end if;
    if tg_op = 'DELETE' then
      if exists(select 1 from public.order_inventory_reservations
        where product_variant_id = old.id and status = 'reserved' and expires_at > now()) then
        raise exception 'A variant with an active checkout reservation cannot be removed.' using errcode = '23514';
      end if;
      return old;
    end if;
    if exists(select 1 from public.order_inventory_reservations
      where product_variant_id = old.id and status = 'reserved' and expires_at > now())
      and (new.options is distinct from old.options
        or new.price_adjustment_cents is distinct from old.price_adjustment_cents
        or new.is_active is distinct from old.is_active
        or new.sku is distinct from old.sku) then
      raise exception 'Variant options and price cannot change during an active checkout reservation.' using errcode = '23514';
    end if;
    if new.product_id <> old.product_id then
      raise exception 'A product variant cannot be moved to another product.' using errcode = '23514';
    end if;
    if new.stock_quantity < old.stock_quantity then
      select coalesce(sum(quantity), 0)::integer into v_held
      from public.order_inventory_reservations
      where product_variant_id = old.id and status = 'reserved' and expires_at > now();
      if new.stock_quantity < v_held then
        raise exception 'Variant stock cannot be reduced below active checkout reservations.' using errcode = '23514';
      end if;
    end if;
    return new;
  end if;
  return new;
end;
$$;
revoke all on function public.protect_reserved_inventory() from public, anon, authenticated;
drop trigger if exists products_protect_reserved_inventory on public.products;
create trigger products_protect_reserved_inventory before update of stock_quantity on public.products
  for each row execute function public.protect_reserved_inventory();
drop trigger if exists product_variants_protect_reserved_inventory on public.product_variants;
create trigger product_variants_protect_reserved_inventory before insert or update or delete on public.product_variants
  for each row execute function public.protect_reserved_inventory();

create or replace function public.vanta_variant_matches_configuration(p_options jsonb, p_configuration jsonb)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_pair record;
  v_expected text;
begin
  if jsonb_typeof(coalesce(p_options, '{}'::jsonb)) <> 'object' then return false; end if;
  for v_pair in select key, value #>> '{}' as value from jsonb_each(coalesce(p_options, '{}'::jsonb)) loop
    case lower(v_pair.key)
      when 'color' then v_expected := p_configuration->>'colorName';
      when 'colour' then v_expected := p_configuration->>'colorName';
      when 'size' then v_expected := coalesce(p_configuration->>'size', 'One size');
      when 'material' then v_expected := p_configuration->>'material';
      when 'finish' then v_expected := p_configuration->>'finish';
      else return false;
    end case;
    if v_expected is null or lower(trim(v_pair.value)) <> lower(trim(v_expected)) then return false; end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.vanta_variant_matches_configuration(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.reserve_order_inventory(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_line record;
  v_product public.products%rowtype;
  v_variant record;
  v_variant_count integer;
  v_price_count integer;
  v_available integer;
  v_remaining integer;
  v_take integer;
  v_has_active boolean;
begin
  perform 1 from public.orders where id = p_order_id for update;
  if not found then return false; end if;
  if exists (select 1 from public.order_inventory_reservations where order_id = p_order_id and status = 'committed') then
    return true;
  end if;
  select exists(select 1 from public.order_inventory_reservations
    where order_id = p_order_id and status = 'reserved' and expires_at > now()) into v_has_active;
  if v_has_active and not exists(select 1 from public.order_inventory_reservations
      where order_id = p_order_id and status = 'reserved' and expires_at <= now()) then
    return true;
  end if;

  update public.order_inventory_reservations set status = 'released', updated_at = now()
    where order_id = p_order_id and status = 'reserved' and expires_at <= now();
  delete from public.order_inventory_reservations where order_id = p_order_id and status = 'released';

  -- Lock products in stable order to serialize checkout and admin inventory writes.
  perform p.id from public.products p
    join (select distinct product_id from public.order_items where order_id = p_order_id and product_id is not null) i on i.product_id = p.id
    order by p.id for update of p;

  for v_line in
    select oi.*, p.stock_quantity
    from public.order_items oi join public.products p on p.id = oi.product_id
    where oi.order_id = p_order_id
    order by p.id, oi.id
  loop
    select count(*)::integer into v_variant_count from public.product_variants
      where product_id = v_line.product_id and is_active;
    if v_variant_count > 0 then
      select count(distinct pv.price_adjustment_cents)::integer into v_price_count
      from public.product_variants pv
      where pv.product_id = v_line.product_id and pv.is_active
        and public.vanta_variant_matches_configuration(pv.options, v_line.configuration);
      if v_price_count > 1 then
        raise exception 'Selected variants have conflicting price adjustments.' using errcode = '23514';
      end if;
      select coalesce(sum(pv.stock_quantity - coalesce((
        select sum(r.quantity)::integer from public.order_inventory_reservations r
        where r.product_variant_id = pv.id and r.status = 'reserved' and r.expires_at > now()
      ), 0)), 0)::integer into v_available
      from public.product_variants pv
      where pv.product_id = v_line.product_id and pv.is_active
        and public.vanta_variant_matches_configuration(pv.options, v_line.configuration);
      if v_available < v_line.quantity then
        raise exception 'Selected product variant stock is no longer available.' using errcode = '23514';
      end if;

      v_remaining := v_line.quantity;
      for v_variant in
        select pv.id, pv.stock_quantity, coalesce((select sum(r.quantity)::integer
          from public.order_inventory_reservations r where r.product_variant_id = pv.id
          and r.status = 'reserved' and r.expires_at > now()), 0) as reserved
        from public.product_variants pv
        where pv.product_id = v_line.product_id and pv.is_active
          and public.vanta_variant_matches_configuration(pv.options, v_line.configuration)
        order by pv.sort_order, pv.id
      loop
        v_take := least(v_remaining, greatest(0, v_variant.stock_quantity - v_variant.reserved));
        if v_take > 0 then
          insert into public.order_inventory_reservations(order_id, order_item_id, product_id, product_variant_id, quantity, expires_at)
          values (p_order_id, v_line.id, v_line.product_id, v_variant.id, v_take, now() + interval '24 hours 5 minutes')
          on conflict (order_item_id, product_variant_id) where product_variant_id is not null
          do update set quantity = excluded.quantity, status = 'reserved', expires_at = excluded.expires_at, updated_at = now();
          v_remaining := v_remaining - v_take;
        end if;
        exit when v_remaining = 0;
      end loop;
    else
      select v_line.stock_quantity - coalesce(sum(r.quantity)::integer, 0) into v_available
      from public.order_inventory_reservations r
      where r.product_id = v_line.product_id and r.product_variant_id is null
        and r.status = 'reserved' and r.expires_at > now();
      if v_available is null then v_available := v_line.stock_quantity; end if;
      if v_available < v_line.quantity then
        raise exception 'Product stock is no longer available.' using errcode = '23514';
      end if;
      insert into public.order_inventory_reservations(order_id, order_item_id, product_id, product_variant_id, quantity, expires_at)
      values (p_order_id, v_line.id, v_line.product_id, null, v_line.quantity, now() + interval '24 hours 5 minutes')
      on conflict (order_item_id) where product_variant_id is null
      do update set quantity = excluded.quantity, status = 'reserved', expires_at = excluded.expires_at, updated_at = now();
    end if;
  end loop;
  return exists(select 1 from public.order_items where order_id = p_order_id);
end;
$$;
revoke all on function public.reserve_order_inventory(uuid) from public, anon, authenticated;
grant execute on function public.reserve_order_inventory(uuid) to service_role;

create or replace function public.commit_order_inventory(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation record;
  v_name text;
  v_sku text;
begin
  perform 1 from public.orders where id = p_order_id for update;
  if not found then return false; end if;
  if exists(select 1 from public.order_inventory_reservations where order_id = p_order_id and status = 'committed') then
    if exists(select 1 from public.order_inventory_reservations where order_id = p_order_id and status = 'reserved') then
      raise exception 'Order has mixed committed and reserved inventory.' using errcode = '23514';
    end if;
    return true;
  end if;
  if not exists(select 1 from public.order_inventory_reservations where order_id = p_order_id and status = 'reserved') then
    return false;
  end if;
  if exists(select 1 from public.order_inventory_reservations where order_id = p_order_id and status <> 'reserved') then
    return false;
  end if;
  if exists(select 1 from public.order_inventory_reservations where order_id = p_order_id and expires_at <= now()) then
    return false;
  end if;

  perform p.id from public.products p
    join (select distinct product_id from public.order_inventory_reservations where order_id = p_order_id) r on r.product_id = p.id
    order by p.id for update of p;
  -- Release this order's holds inside the transaction before reducing stock;
  -- any failure below rolls this status update back with the inventory changes.
  update public.order_inventory_reservations set status = 'committed', updated_at = now()
    where order_id = p_order_id and status = 'reserved';
  for v_reservation in select * from public.order_inventory_reservations
    where order_id = p_order_id and status = 'committed' order by product_id, product_variant_id nulls first, id for update
  loop
    select name into v_name from public.products where id = v_reservation.product_id;
    if v_reservation.product_variant_id is null then
      update public.products set stock_quantity = stock_quantity - v_reservation.quantity, updated_at = now()
        where id = v_reservation.product_id and stock_quantity >= v_reservation.quantity;
      if not found then raise exception 'Reserved product stock is no longer available.' using errcode = '23514'; end if;
      v_sku := null;
    else
      update public.product_variants set stock_quantity = stock_quantity - v_reservation.quantity, updated_at = now()
        where id = v_reservation.product_variant_id and stock_quantity >= v_reservation.quantity
        returning sku into v_sku;
      if not found then raise exception 'Reserved variant stock is no longer available.' using errcode = '23514'; end if;
    end if;
    insert into public.inventory_movements(product_id, variant_id, product_name, sku, quantity_delta, reason, reference)
      values (v_reservation.product_id, v_reservation.product_variant_id, v_name, v_sku,
        -v_reservation.quantity, 'Paid checkout', p_order_id::text);
  end loop;
  update public.orders set status = 'processing', payment_status = 'paid',
    paid_at = coalesce(paid_at, now()), updated_at = now()
    where id = p_order_id;
  return true;
end;
$$;
revoke all on function public.commit_order_inventory(uuid) from public, anon, authenticated;
grant execute on function public.commit_order_inventory(uuid) to service_role;

create or replace function public.release_order_inventory(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment_status text;
begin
  select payment_status into v_payment_status from public.orders where id = p_order_id for update;
  if not found or v_payment_status = 'paid' then return true; end if;
  update public.order_inventory_reservations set status = 'released', updated_at = now()
    where order_id = p_order_id and status = 'reserved';
  delete from public.discount_reservations where order_id = p_order_id;
  return true;
end;
$$;
revoke all on function public.release_order_inventory(uuid) from public, anon, authenticated;
grant execute on function public.release_order_inventory(uuid) to service_role;

create or replace function public.reserve_discount_for_order(p_code text, p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_discount public.discounts%rowtype;
  v_active_reservations integer;
begin
  select * into v_discount from public.discounts where code = upper(trim(p_code)) for update;
  if not found or not v_discount.active or (v_discount.starts_at is not null and v_discount.starts_at > now())
    or (v_discount.expires_at is not null and v_discount.expires_at <= now()) then return false; end if;
  if exists(select 1 from public.discount_reservations where order_id = p_order_id and discount_id = v_discount.id and expires_at > now()) then
    return true;
  end if;
  delete from public.discount_reservations where order_id = p_order_id;
  select count(*)::integer into v_active_reservations from public.discount_reservations
    where discount_id = v_discount.id and expires_at > now();
  if v_discount.usage_limit is not null and v_discount.usage_count + v_active_reservations >= v_discount.usage_limit then
    return false;
  end if;
  insert into public.discount_reservations(order_id, discount_id, expires_at)
    values (p_order_id, v_discount.id, now() + interval '24 hours 5 minutes');
  return true;
end;
$$;
revoke all on function public.reserve_discount_for_order(text, uuid) from public, anon, authenticated;
grant execute on function public.reserve_discount_for_order(text, uuid) to service_role;

create or replace function public.redeem_discount_for_order(p_code text, p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_discount public.discounts%rowtype;
  v_had_reservation boolean;
begin
  select * into v_discount from public.discounts where code = upper(trim(p_code)) for update;
  if not found then return false; end if;
  delete from public.discount_reservations where order_id = p_order_id and discount_id = v_discount.id;
  v_had_reservation := found;
  if exists(select 1 from public.discount_redemptions where order_id = p_order_id) then return true; end if;
  if not v_had_reservation and (not v_discount.active
    or (v_discount.starts_at is not null and v_discount.starts_at > now())
    or (v_discount.expires_at is not null and v_discount.expires_at <= now())) then return false; end if;
  if not v_had_reservation and v_discount.usage_limit is not null and v_discount.usage_count >= v_discount.usage_limit then
    return false;
  end if;
  insert into public.discount_redemptions(discount_id, order_id) values (v_discount.id, p_order_id);
  update public.discounts set usage_count = usage_count + 1 where id = v_discount.id;
  return true;
end;
$$;
revoke all on function public.redeem_discount_for_order(text, uuid) from public, anon, authenticated;
grant execute on function public.redeem_discount_for_order(text, uuid) to service_role;

-- Twenty additional catalog studies bring the seeded database to 30 connected
-- products across all five categories and six published collections.
insert into public.products (
  slug, name, description, story, category_slug, images, image_alt, materials, colors, color_swatches,
  price_cents, sale_price_cents, stock_quantity, average_rating, rating_count, sales_count, featured_rank,
  collection_slug, collection_name, is_published, is_demo, created_at
)
values
  ('arc-vessel', 'Arc Vessel', 'A cast aluminum vessel shaped around a continuous, open line.', 'A VANTA study in cast aluminum and quiet proportion. Arc Vessel brings a precise detail to familiar rituals, with a tactile finish designed to settle naturally into its surroundings.', 'objects', array['/images/concepts/object-concept.webp','/images/products/negative-space-detail.webp'], 'Arc Vessel cast aluminum study', array['Cast aluminum','Satin-finished composite'], array['Pewter','Sand'], '[{"name":"Pewter","hex":"#85877f"},{"name":"Sand","hex":"#b8a992"}]'::jsonb, 26800, null, 18, 4.4, 8, 18, 11, 'material-memory', 'Material Memory', true, true, '2026-11-06T10:00:00Z'),
  ('monolith-tray', 'Monolith Catchall', 'A compact catchall formed as a quiet landing place for daily objects.', 'Bead-blasted aluminum gives Monolith Catchall a soft touch and a grounded silhouette. A practical form, reduced to its essential plane.', 'objects', array['/images/concepts/object-concept.webp','/images/products/bookends.webp'], 'Monolith Catchall aluminum tray', array['Bead-blasted aluminum','Satin-finished composite'], array['Chalk','Bronze'], '[{"name":"Chalk","hex":"#d7d0c4"},{"name":"Bronze","hex":"#7d6246"}]'::jsonb, 12400, 10800, 26, 4.5, 11, 29, 12, 'edition-001', 'Edition 001 / The first signal', true, true, '2026-11-07T10:00:00Z'),
  ('folded-object', 'Folded Object No. 2', 'A folded steel desk form that holds small tools in view.', 'A measured bend in formed steel creates a useful pocket and a strong line. The object is meant to be handled, not explained.', 'objects', array['/images/concepts/object-concept.webp','/images/products/negative-space-detail.webp'], 'Folded Object No. 2 steel design study', array['Formed steel','Satin-finished composite'], array['Graphite','Stone'], '[{"name":"Graphite","hex":"#454745"},{"name":"Stone","hex":"#b5ab9c"}]'::jsonb, 19800, null, 7, 4.6, 14, 38, 13, 'material-memory', 'Material Memory', true, true, '2026-11-06T11:00:00Z'),
  ('resonance-mini', 'Resonance / Mini', 'A compact acoustic form for near-field listening.', 'Soft acoustic mesh draws the eye toward a quiet, precise enclosure. Resonance / Mini brings close listening into smaller rooms.', 'audio', array['/images/concepts/audio-concept.webp','/images/products/resonance-detail.webp'], 'Resonance Mini compact speaker', array['Acoustic mesh','Anodized aluminum'], array['Obsidian','Ash'], '[{"name":"Obsidian","hex":"#272925"},{"name":"Ash","hex":"#85827a"}]'::jsonb, 36000, null, 12, 4.7, 17, 45, 14, 'signal-and-silence', 'Signal / Silence', true, true, '2026-11-06T12:00:00Z'),
  ('field-recorder', 'Field Recorder', 'A pocket-sized recorder with a tactile aluminum shell.', 'Field Recorder is designed around the moment of capture: clear controls, a durable shell, and room for sound to remain the focus.', 'audio', array['/images/concepts/audio-concept.webp','/images/products/headphones.webp'], 'Field Recorder aluminum audio concept', array['Anodized aluminum','Acoustic fabric'], array['Black','Silver'], '[{"name":"Black","hex":"#161817"},{"name":"Silver","hex":"#aaa9a1"}]'::jsonb, 28500, 24900, 9, 4.8, 20, 57, 15, 'signal-and-silence', 'Signal / Silence', true, true, '2026-11-07T12:00:00Z'),
  ('still-speaker', 'Still / Wireless Speaker', 'A room-filling speaker in a quiet, rounded enclosure.', 'Smoked titanium and acoustic mesh balance a precise exterior with a soft listening presence. Still is made to belong in the room between tracks.', 'audio', array['/images/concepts/audio-concept.webp','/images/products/resonance-detail.webp'], 'Still wireless speaker concept', array['Smoked titanium','Acoustic mesh'], array['Graphite','Champagne'], '[{"name":"Graphite","hex":"#3b3d3c"},{"name":"Champagne","hex":"#b59d7c"}]'::jsonb, 64000, null, 5, 4.9, 23, 69, 16, 'edition-001', 'Edition 001 / The first signal', true, true, '2026-11-06T13:00:00Z'),
  ('vector-form-low', 'Vector Form / Low', 'A lower technical-knit silhouette for a lighter city stride.', 'Vector Form / Low keeps a continuous upper and shaped polymer sole close to the ground. A movement study in proportion and everyday comfort.', 'footwear', array['/images/concepts/footwear-concept.webp','/images/products/vector-form-detail.webp'], 'Vector Form Low technical knit shoe', array['Technical knit','Recycled polymer'], array['Bone','Ash'], '[{"name":"Bone","hex":"#dbd1bd"},{"name":"Ash","hex":"#85827a"}]'::jsonb, 21800, null, 21, 4.6, 26, 82, 17, 'motion-study', 'Motion Study', true, true, '2026-11-06T14:00:00Z'),
  ('drift-runner', 'Drift Runner', 'A light runner with a breathable knit upper and grounded sole.', 'Drift Runner traces a clean line between movement and rest. Recycled knit and a formed sole keep the construction light and intentional.', 'footwear', array['/images/concepts/footwear-concept.webp','/images/products/traverse-shoe.webp'], 'Drift Runner recycled knit footwear', array['Recycled knit','Recycled polymer'], array['Moss','Bone'], '[{"name":"Moss","hex":"#68705d"},{"name":"Bone","hex":"#d7cebd"}]'::jsonb, 26400, null, 16, 4.7, 29, 93, 18, 'motion-study', 'Motion Study', true, true, '2026-11-07T14:00:00Z'),
  ('transit-shell', 'Transit Shell', 'A protective knit shoe built for changing city weather.', 'Transit Shell layers a close technical knit over a stable recycled polymer base. The silhouette favors considered movement over excess structure.', 'footwear', array['/images/concepts/footwear-concept.webp','/images/products/traverse-shoe.webp'], 'Transit Shell technical footwear study', array['Technical knit','Recycled polymer'], array['Slate','Chalk'], '[{"name":"Slate","hex":"#626b6d"},{"name":"Chalk","hex":"#d7d0c4"}]'::jsonb, 31200, null, 3, 4.5, 32, 104, 19, 'edition-001', 'Edition 001 / The first signal', true, true, '2026-11-06T15:00:00Z'),
  ('afterlight-portable', 'Afterlight / Portable', 'A portable pool of warm light held in a palm-sized form.', 'Opal glass softens a warm LED while a compact base makes Afterlight / Portable easy to move from room to room.', 'living', array['/images/concepts/living-concept.webp','/images/products/afterlight-detail.webp'], 'Portable opal glass lamp', array['Opal glass','Honed basalt'], array['Warm White','Basalt'], '[{"name":"Warm White","hex":"#ded3be"},{"name":"Basalt","hex":"#383a36"}]'::jsonb, 38800, null, 13, 4.8, 35, 115, 20, 'light-held', 'Light, Held', true, true, '2026-11-06T16:00:00Z'),
  ('orbit-floor-light', 'Orbit Floor Light', 'A slender floor light with a floating satin bronze head.', 'A weighted base and fine stem bring a measured vertical line to the room. Orbit Floor Light directs warmth where it is needed without taking the room over.', 'living', array['/images/concepts/living-concept.webp','/images/products/orbit-table.webp'], 'Orbit Floor Light bronze design study', array['Satin bronze','Blackened steel'], array['Bronze','Blackened steel'], '[{"name":"Bronze","hex":"#8b7154"},{"name":"Blackened steel","hex":"#282a28"}]'::jsonb, 96000, null, 4, 4.7, 38, 126, 21, 'light-held', 'Light, Held', true, true, '2026-11-07T16:00:00Z'),
  ('quiet-hour-clock', 'Quiet Hour Clock', 'A quiet analog clock with a clear face and soft ticking movement.', 'Quiet Hour Clock takes the clarity of a personal instrument and gives it a place on the wall. Brushed metal and a measured dial keep the passing hour calm.', 'living', array['/images/concepts/living-concept.webp','/images/products/meridian-watch.webp'], 'Quiet Hour analog wall clock', array['Brushed stainless steel','Mineral glass'], array['Olive','Black'], '[{"name":"Olive","hex":"#63654b"},{"name":"Black","hex":"#20211e"}]'::jsonb, 24800, null, 10, 4.6, 41, 137, 22, 'material-memory', 'Material Memory', true, true, '2026-11-06T17:00:00Z'),
  ('form-02-eyewear', 'Form / 02 Eyewear', 'A titanium frame with a softer, rounded lens profile.', 'Form / 02 extends the eyewear study through a rounder lens and a light titanium bridge. A small personal object, reduced to its essential line.', 'accessories', array['/images/concepts/accessories-concept.webp','/images/products/eyewear-detail.webp'], 'Form 02 titanium eyewear frame', array['Titanium','Optical acetate'], array['Silver','Olive'], '[{"name":"Silver","hex":"#aaa9a1"},{"name":"Olive","hex":"#676b54"}]'::jsonb, 39800, null, 15, 4.8, 44, 148, 23, 'form-of-time', 'The Form of Time', true, true, '2026-11-07T17:00:00Z'),
  ('meridian-strap', 'Meridian Strap Set', 'Two interchangeable straps shaped for the Meridian watch.', 'A considered pair of leather straps changes the character of Meridian without changing its scale. Vegetable-tanned leather gains a quiet patina with use.', 'accessories', array['/images/concepts/accessories-concept.webp','/images/products/meridian-watch.webp'], 'Meridian watch strap set in leather', array['Vegetable-tanned leather','Stainless steel'], array['Black','Walnut'], '[{"name":"Black","hex":"#20211e"},{"name":"Walnut","hex":"#5b3d2e"}]'::jsonb, 9800, 8200, 32, 4.9, 47, 159, 24, 'form-of-time', 'The Form of Time', true, true, '2026-11-06T18:00:00Z'),
  ('signal-key-object', 'Signal Key Object', 'A machined titanium key form with a tactile, balanced edge.', 'Signal Key Object turns a small everyday carry into a precise study of edge and weight. The titanium surface catches light without calling for it.', 'accessories', array['/images/concepts/accessories-concept.webp','/images/products/eyewear-detail.webp'], 'Machined titanium key object', array['Machined titanium','Satin-finished composite'], array['Pewter','Black'], '[{"name":"Pewter","hex":"#85877f"},{"name":"Black","hex":"#20211e"}]'::jsonb, 14500, null, 2, 4.5, 50, 170, 25, 'edition-001', 'Edition 001 / The first signal', true, true, '2026-11-07T18:00:00Z'),
  ('silt-stoneware', 'Silt Stoneware', 'A low stoneware vessel with a softly textured glaze.', 'Silt Stoneware is formed around the trace of the hand. A tactile glaze and grounded shape bring a small, useful calm to a table or shelf.', 'objects', array['/images/concepts/object-concept.webp','/images/products/negative-space-detail.webp'], 'Silt glazed stoneware vessel', array['Glazed stoneware','Mineral pigment'], array['Silt','Charcoal'], '[{"name":"Silt","hex":"#a79c89"},{"name":"Charcoal","hex":"#454745"}]'::jsonb, 16400, null, 20, 4.6, 53, 181, 26, 'material-memory', 'Material Memory', true, true, '2026-11-06T19:00:00Z'),
  ('hush-earbuds', 'Hush / In-ear', 'A compact in-ear listening form with a ceramic composite shell.', 'Hush / In-ear is a close listening object reduced to a comfortable, tactile shell. The case follows the same soft line and slips easily into a pocket.', 'audio', array['/images/concepts/audio-concept.webp','/images/products/headphones.webp'], 'Hush in-ear audio concept', array['Ceramic composite','Acoustic fabric'], array['Bone','Graphite'], '[{"name":"Bone","hex":"#d7cebd"},{"name":"Graphite","hex":"#3b3d3c"}]'::jsonb, 22800, null, 24, 4.7, 56, 192, 27, 'signal-and-silence', 'Signal / Silence', true, true, '2026-11-07T19:00:00Z'),
  ('contour-slide', 'Contour Slide', 'A molded slide with a continuous, supportive footbed.', 'Contour Slide explores the everyday shoe as a single line. Recycled polymer creates a supportive footbed with a restrained, easy profile.', 'footwear', array['/images/concepts/footwear-concept.webp','/images/products/traverse-shoe.webp'], 'Contour Slide molded footwear', array['Recycled polymer','Textured rubber'], array['Stone','Moss'], '[{"name":"Stone","hex":"#b5aa98"},{"name":"Moss","hex":"#68705d"}]'::jsonb, 15200, null, 0, 4.4, 59, 203, 28, 'motion-study', 'Motion Study', true, true, '2026-11-06T20:00:00Z'),
  ('halo-wall-light', 'Halo Wall Light', 'An opal glass wall light that leaves a soft ring of warmth.', 'Halo Wall Light sits close to the wall and diffuses light through opal glass. A compact fixture designed to make the edges of a room feel more generous.', 'living', array['/images/concepts/living-concept.webp','/images/products/afterlight-detail.webp'], 'Halo opal glass wall light', array['Opal glass','Honed basalt'], array['Warm White','Basalt'], '[{"name":"Warm White","hex":"#ded3be"},{"name":"Basalt","hex":"#383a36"}]'::jsonb, 47200, null, 8, 4.8, 62, 214, 29, 'light-held', 'Light, Held', true, true, '2026-11-07T20:00:00Z'),
  ('index-card-case', 'Index Card Case', 'A slim leather case for the cards and notes kept close.', 'Index Card Case is cut from vegetable-tanned leather and stitched around a clean, low profile. It is made to soften with daily use and age with intention.', 'accessories', array['/images/concepts/accessories-concept.webp','/images/products/eyewear-detail.webp'], 'Index leather card case', array['Vegetable-tanned leather','Cotton lining'], array['Walnut','Black'], '[{"name":"Walnut","hex":"#5b3d2e"},{"name":"Black","hex":"#20211e"}]'::jsonb, 18600, null, 19, 4.9, 65, 225, 30, 'form-of-time', 'The Form of Time', true, true, '2026-11-06T21:00:00Z')
on conflict (slug) do nothing;

update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif','model/gltf-binary','model/gltf+json']
where id = 'vanta-product-media';

comment on table public.order_inventory_reservations is 'Temporary, transactional checkout stock holds. Stock is decremented only after a verified paid Stripe session.';
comment on table public.discount_reservations is 'Temporary checkout holds counted against limited-use discount codes.';
