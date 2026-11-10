# VANTA admin setup

The command center uses Supabase Auth for identity, `admin_roles` for authorization, and server-only service-role access for administrative queries and writes. The service-role key must never use a `NEXT_PUBLIC_` variable.

## Configure and migrate

Set the Supabase variables from `.env.example` in local development and in the Vercel project environment. Apply the migrations in `supabase/migrations` in timestamp order, including `20261114000000_admin_command_center.sql`. The command center adds the admin role table, RLS policies, product variants, inventory movement history, media storage policies, and transaction-safe admin RPCs.

## Grant the first administrator

Create the person’s account through Supabase Auth first. Then run this statement in the Supabase SQL editor using an owner-controlled session, replacing the example address:

```sql
insert into public.admin_roles (user_id, role)
select id, 'super_admin'
from auth.users
where email = lower('admin@example.com')
on conflict (user_id) do update set role = excluded.role;
```

If the statement inserts or updates no row, verify the account exists in Supabase Auth and rerun it. Customer-facing users cannot insert or edit `admin_roles`; the first grant must stay an out-of-band operation.

## Operational notes

- Product and variant saves, inventory adjustments, and fulfillment updates use database transactions. Payment status remains controlled by verified payment events.
- Product image and 3D model files are stored in the `vanta-product-media` bucket created by the migration. GLB is preferred for a self-contained model.
- Dashboard revenue and order values use paid orders. Conversion stays unavailable until real storefront session events exist; the public event policy does not allow visitors to claim purchases.
- The admin dashboard and APIs require all three Supabase variables at runtime. A missing role, missing migration, or missing server credential produces a setup/access response without exposing database keys.
