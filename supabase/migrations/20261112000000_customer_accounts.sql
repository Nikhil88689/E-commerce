create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  email_marketing boolean not null default false,
  order_updates boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
drop policy if exists "Customers can manage their own profile" on public.profiles;
create policy "Customers can manage their own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, update, delete on public.profiles to authenticated;

create or replace function public.create_customer_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.create_customer_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_customer_profile on auth.users;
create trigger on_auth_user_created_customer_profile
  after insert on auth.users
  for each row execute procedure public.create_customer_profile();

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null references public.products(slug) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_slug)
);
create index if not exists wishlist_items_user_created_idx on public.wishlist_items (user_id, created_at desc);

alter table public.wishlist_items enable row level security;
drop policy if exists "Customers can manage their wishlist" on public.wishlist_items;
create policy "Customers can manage their wishlist" on public.wishlist_items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
grant select, insert, update, delete on public.wishlist_items to authenticated;

alter table public.orders add column if not exists fulfillment_status text not null default 'unfulfilled'
  check (fulfillment_status in ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'));
alter table public.orders add column if not exists shipment_carrier text;
alter table public.orders add column if not exists tracking_number text;
alter table public.orders add column if not exists tracking_url text;
alter table public.orders add column if not exists shipped_at timestamptz;
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.orders add column if not exists cancelled_at timestamptz;

comment on table public.profiles is 'Customer profile and communication preferences; each row is visible only to its owner.';
comment on table public.wishlist_items is 'Customer-owned saved product slugs with row-level access enforcement.';
comment on column public.orders.fulfillment_status is 'Fulfillment state maintained by trusted order operations; no shipping state is fabricated.';
