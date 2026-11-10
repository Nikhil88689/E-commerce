create table if not exists public.saved_configurations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null references public.products(slug) on delete cascade,
  configuration jsonb not null,
  updated_at timestamptz not null default now(),
  unique (user_id, product_slug)
);

alter table public.saved_configurations enable row level security;

drop policy if exists "Customers can read their saved configurations" on public.saved_configurations;
create policy "Customers can read their saved configurations"
  on public.saved_configurations for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Customers can create their saved configurations" on public.saved_configurations;
create policy "Customers can create their saved configurations"
  on public.saved_configurations for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Customers can update their saved configurations" on public.saved_configurations;
create policy "Customers can update their saved configurations"
  on public.saved_configurations for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Customers can delete their saved configurations" on public.saved_configurations;
create policy "Customers can delete their saved configurations"
  on public.saved_configurations for delete
  to authenticated
  using (auth.uid() = user_id);
