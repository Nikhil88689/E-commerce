create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code)),
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  amount integer not null check (amount > 0),
  minimum_subtotal_cents integer not null default 0 check (minimum_subtotal_cents >= 0),
  maximum_discount_cents integer check (maximum_discount_cents is null or maximum_discount_cents >= 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or amount <= 100)
);

insert into public.discounts (code, discount_type, amount, minimum_subtotal_cents, maximum_discount_cents, usage_limit)
values ('VANTA10', 'percent', 10, 5000, 5000, 1000)
on conflict (code) do nothing;

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  guest_token_hash text unique,
  currency text not null default 'USD' check (char_length(currency) = 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_token_hash is not null)
);
create unique index if not exists carts_user_unique_idx on public.carts (user_id);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_slug text not null,
  variant_id text not null,
  quantity integer not null check (quantity > 0),
  configuration jsonb not null default '{}'::jsonb,
  is_saved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);
alter table public.cart_items add column if not exists is_saved boolean not null default false;

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text not null,
  postal_code text not null,
  country_code text not null check (char_length(country_code) = 2),
  address_hash text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses (user_id, is_default desc, updated_at desc);
create unique index if not exists addresses_user_hash_unique_idx on public.addresses (user_id, address_hash);

alter table public.orders alter column user_id drop not null;
alter table public.orders add column if not exists order_number text unique;
alter table public.orders add column if not exists idempotency_key text unique;
alter table public.orders add column if not exists request_fingerprint text;
alter table public.orders add column if not exists email text;
alter table public.orders add column if not exists phone text;
alter table public.orders add column if not exists shipping_address jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists shipping_method text not null default 'standard';
alter table public.orders add column if not exists shipping_estimate text not null default '';
alter table public.orders add column if not exists discount_id uuid references public.discounts(id) on delete set null;
alter table public.orders add column if not exists discount_code text;
alter table public.orders add column if not exists discount_cents integer not null default 0 check (discount_cents >= 0);
alter table public.orders add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded'));
alter table public.orders add column if not exists stripe_payment_intent_id text;
alter table public.orders add column if not exists paid_at timestamptz;

create unique index if not exists order_items_variant_unique_idx on public.order_items (order_id, variant_id);
alter table public.order_items add column if not exists cart_item_refs jsonb not null default '[]'::jsonb;
alter table public.order_items add column if not exists product_image_url text;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processing_status text not null default 'processing' check (processing_status in ('processing', 'processed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table if not exists public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_id uuid not null references public.discounts(id) on delete restrict,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  redeemed_at timestamptz not null default now()
);

create or replace function public.redeem_discount_for_order(p_code text, p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_discount_id uuid;
  v_limit integer;
  v_count integer;
begin
  select id, usage_limit, usage_count
    into v_discount_id, v_limit, v_count
    from public.discounts
    where code = upper(trim(p_code)) and active = true
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at > now())
    for update;

  if not found or (v_limit is not null and v_count >= v_limit) then
    return false;
  end if;

  insert into public.discount_redemptions (discount_id, order_id)
  values (v_discount_id, p_order_id)
  on conflict (order_id) do nothing;

  if not found then
    return true;
  end if;

  update public.discounts set usage_count = usage_count + 1 where id = v_discount_id;
  return true;
end;
$$;

revoke all on function public.redeem_discount_for_order(text, uuid) from public;
grant execute on function public.redeem_discount_for_order(text, uuid) to service_role;

alter table public.discounts enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.addresses enable row level security;
alter table public.payments enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.discount_redemptions enable row level security;

drop policy if exists "Public can inspect active discount codes" on public.discounts;
create policy "Public can inspect active discount codes" on public.discounts
  for select to anon, authenticated using (active = true);
grant select on public.discounts to anon, authenticated;

drop policy if exists "Customers can read their carts" on public.carts;
create policy "Customers can read their carts" on public.carts
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Customers can manage their carts" on public.carts;
create policy "Customers can manage their carts" on public.carts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Customers can read their cart items" on public.cart_items;
create policy "Customers can read their cart items" on public.cart_items
  for select to authenticated using (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()));
drop policy if exists "Customers can manage their cart items" on public.cart_items;
create policy "Customers can manage their cart items" on public.cart_items
  for all to authenticated using (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()))
  with check (exists (select 1 from public.carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid()));

drop policy if exists "Customers can manage their addresses" on public.addresses;
create policy "Customers can manage their addresses" on public.addresses
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Customers can read payments for their orders" on public.payments;
create policy "Customers can read payments for their orders" on public.payments
  for select to authenticated using (exists (select 1 from public.orders where orders.id = payments.order_id and orders.user_id = auth.uid()));

drop policy if exists "Customers can read their discount redemptions" on public.discount_redemptions;
create policy "Customers can read their discount redemptions" on public.discount_redemptions
  for select to authenticated using (exists (select 1 from public.orders where orders.id = discount_redemptions.order_id and orders.user_id = auth.uid()));

comment on column public.orders.idempotency_key is 'Unique client operation key used to make checkout session creation safe to retry.';
comment on column public.order_items.configuration is 'Product configuration snapshot for the exact purchased variant.';
