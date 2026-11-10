create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
  currency text not null default 'USD' check (char_length(currency) = 3),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  stripe_checkout_session_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_slug text not null,
  product_name text not null,
  variant_id text not null,
  quantity integer not null check (quantity > 0),
  unit_amount_cents integer not null check (unit_amount_cents >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists orders_owner_created_idx on public.orders (user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Customers can read their orders" on public.orders;
create policy "Customers can read their orders"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Customers can read their order items" on public.order_items;
create policy "Customers can read their order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and orders.user_id = auth.uid()
    )
  );

comment on column public.order_items.configuration is
  'Immutable product configuration snapshot copied from the cart when a trusted checkout service creates an order.';
