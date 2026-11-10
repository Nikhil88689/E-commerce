# VANTA implementation plan

## Foundation delivered in this pass

- Establish a strict Next.js App Router and TypeScript baseline that deploys cleanly on Vercel.
- Set up the shared storefront shell, responsive visual tokens, accessible navigation, and reduced-motion-aware animation entry points.
- Prepare typed integration boundaries for Supabase, Stripe, catalog data, and persistent cart state without claiming those services are configured.
- Keep the route tree small: implement the homepage only and document the remaining route groups for staged delivery.

## Product build sequence

1. **Commerce domain and data** — finalize product, variant, collection, inventory, customer, order, and discount schemas; add Supabase migrations, generated database types, and storage policies.
2. **Catalog and discovery** — build discover/category, product, collections, drops, stories, and search routes against real managed data with filters, SEO metadata, and complete empty/error states.
3. **Product studio** — add the model asset pipeline, accessible 3D controls, customization state, mobile fallbacks, and performance budgets.
4. **Cart and identity** — connect the persistent cart to live variants and prices; implement Supabase auth, customer profile, wishlist, and order history.
5. **Checkout and operations** — implement server-created Stripe Checkout sessions, signed webhook order fulfillment, customer notifications, and admin workflows guarded by role checks and row-level security.
6. **Release hardening** — add analytics and observability, image and model optimization, security review, accessibility review, content QA, and Vercel preview/production environment setup.

## Route and module boundaries

- `app/(storefront)` owns public discovery, commerce, and editorial pages and their shared shell.
- `app/(auth)` owns sign-in and registration flows.
- `app/account` owns authenticated customer pages.
- `app/admin` owns role-protected operations pages.
- `app/api` owns server-only integrations and webhooks; browser code never receives service-role or Stripe secrets.
- `components` contains reusable presentation, `lib` contains integration and domain utilities, `hooks` contains client hooks, `state` contains client state, `types` contains shared domain shapes, and `supabase` contains migrations and seed material.

## Planned route map

Public: `/`, `/discover`, `/discover/[category]`, `/product/[slug]`, `/product/[slug]/studio`, `/collections`, `/collections/[slug]`, `/drops`, `/stories`, `/stories/[slug]`, `/search`.

Customer: `/cart`, `/checkout`, `/account`, `/account/orders`, `/account/orders/[id]`, `/account/wishlist`, `/account/settings`, `/login`, `/register`.

Admin: `/admin`, `/admin/products`, `/admin/products/new`, `/admin/orders`, `/admin/customers`, `/admin/inventory`, `/admin/discounts`, `/admin/collections`, `/admin/analytics`, `/admin/content`.
