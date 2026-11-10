# VANTA — The Future of Commerce

VANTA is a dark, editorial commerce concept built with the Next.js App Router. It combines a product archive, interactive configuration studio, customer account area, Stripe test checkout, and role-protected admin command center. The bundled catalog is explicitly marked as sample content; it is not a live offer.

<!-- Portfolio captures to add before launch: docs/screenshots/homepage-desktop.png, docs/screenshots/product-studio-mobile.png, docs/screenshots/admin-command-center.png -->

## Features

- Responsive editorial storefront, product discovery, category filters, live search, collections, release pages, and stories.
- Thirty connected sample products across five categories and six collections.
- Product gallery and interactive React Three Fiber customization studio with variant pricing and stock checks.
- Persistent cart, server-calculated checkout quotes, order creation, discount holds, inventory reservations, and Stripe-hosted test payment.
- Supabase Auth customer accounts, order history, addresses, and wishlist.
- Admin product, order, customer, inventory, discount, collection, drop, story, homepage content, and analytics tools.
- Reduced-motion-aware page and scroll motion, accessible labels and focus styles, SEO metadata, generated social image, sitemap, and robots rules.
- Loading and error states throughout; public forms clearly report when backend credentials are unavailable.

## Technology

- Next.js App Router, React, TypeScript, and Tailwind CSS 4.
- GSAP / ScrollTrigger and Motion for React.
- Three.js and React Three Fiber for interactive product scenes.
- Zustand for persistent client cart state.
- Supabase Auth, PostgreSQL, Row Level Security, and Storage.
- Stripe Checkout in test mode.
- React Hook Form, Zod, Lucide, and Playwright.

## Architecture

```text
app/                  App Router pages, metadata files, and API route handlers
components/            Storefront, account, checkout, editorial, admin, motion, and 3D UI
hooks/                 Cart hydration and checkout hooks
lib/                   Catalog, content, account, admin, checkout, security, SEO, and service code
state/                 Zustand cart store
supabase/migrations/   Ordered database schema, RLS, functions, policies, and sample data
public/images/         Optimized WebP product and category artwork
e2e/                   Chromium browser and responsive interaction checks
docs/                  Implementation notes and design system
```

Supabase-backed reads use server services with a local sample-catalog fallback when project configuration is absent. Checkout and admin writes use server-only service credentials, server-side validation, and database functions. Customer ownership and admin access are also enforced by Supabase RLS.

## Requirements

- Node.js 20.19 or newer
- npm 10 or newer
- A Supabase project for persistent catalog, accounts, cart, and order data
- Stripe test-mode credentials for hosted checkout

## Local development

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The app runs at `http://localhost:3000`. Without Supabase, public pages use the local sample catalog. Account persistence, checkout, payment, and admin writes require a configured Supabase project; payment additionally requires Stripe test credentials.

## Environment variables

Copy `.env.example` to `.env.local`, then replace the placeholders.

| Variable | Exposure | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical storefront origin; use the deployed HTTPS domain in production. |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase publishable/anon key; RLS remains required. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Trusted database operations. Never expose with a `NEXT_PUBLIC_` prefix. |
| `STRIPE_SECRET_KEY` | Server only | Stripe test secret beginning with `sk_test_`. |
| `STRIPE_WEBHOOK_SECRET` | Server only | Stripe webhook signing secret beginning with `whsec_`. |
| `NEXT_PUBLIC_PRIVACY_CONTACT` | Public | Privacy contact shown by subscription forms. |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Public | Customer support address shown in the footer. |
| `NEXT_PUBLIC_INSTAGRAM_URL` | Public | Optional Instagram destination. |
| `NEXT_PUBLIC_PINTEREST_URL` | Public | Optional Pinterest destination. |

Do not commit `.env.local` or paste secret keys into client code. `.env.example` contains placeholders only.

## Supabase setup

1. Create a Supabase project and configure its Auth email provider, site URL, and local/preview/production redirect URLs.
2. Install or invoke the Supabase CLI, authenticate, and link the project:

   ```powershell
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push
   ```

3. Set the public Supabase URL and anon/publishable key, plus the service-role key, in local and Vercel environments.
4. Register a customer from `/register`. There are no shared demo credentials in the repository.
5. To grant an existing trusted user admin access, run this statement in the Supabase SQL editor, replacing the email:

   ```sql
   insert into public.admin_roles (user_id, role)
   select id, 'super_admin' from auth.users where email = 'admin@example.com'
   on conflict (user_id) do update set role = excluded.role;
   ```

   Admin roles are assigned out of band; the app does not allow users to grant themselves privileges.

The ordered migrations create the schema, RLS policies, storage bucket, server functions, editorial records, and thirty sample products. Review the migrations against the intended Supabase project before applying them.

## Stripe test checkout

1. Set an `sk_test_` key and `whsec_` webhook signing secret.
2. Set `NEXT_PUBLIC_SITE_URL` to the storefront origin.
3. For local webhook delivery, run the Stripe CLI:

   ```powershell
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

4. Use Stripe's test card numbers from its test documentation. No live payment methods or production Stripe key are accepted by this app.

Checkout totals come from server-side catalog prices and validated product configuration. A verified Stripe event is required before an order is marked paid or stock is decremented.

## Commands

```powershell
npm run dev                         # Start the development server
npm run lint                        # Run ESLint across the project
npm run typecheck                   # Run strict TypeScript checking
npm run build                       # Create the production build
npm run start                       # Serve the production build
npm run test:e2e                    # Build and run the Chromium browser suite
npm audit --audit-level=moderate    # Check dependencies for known vulnerabilities
```

## Vercel deployment

The repository includes `vercel.json` with the Next.js framework preset and `npm run build` command. Vercel uses its standard Next.js output handling; no custom output directory or rewrite is needed.

1. Import the repository into Vercel and select the Next.js preset. Keep the install command as `npm install` and the output directory at its default.
2. Add the environment variables above to the intended Preview and Production environments. Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS domain. Public variables are embedded during build, so redeploy after changing them.
3. Apply Supabase migrations and configure Auth redirect URLs for the Vercel domains before enabling customer features.
4. Configure Stripe test keys and register the deployed `/api/payments/webhook` URL with Stripe. Use a live Stripe account only after a separate production payment review.
5. Deploy a Preview first. Verify account redirects, media uploads, product queries, checkout session creation, and webhook delivery against the intended test services before promoting a Production deployment.

The application has not been deployed from this repository. Deployment, live database access, email delivery, and payment processing depend on external project configuration.

## Known launch configuration

- Newsletter and drop-notification requests are persisted with consent, but no email delivery provider is connected.
- Bundled product imagery, ratings, inventory, and prices are portfolio sample data. Replace or approve these records before presenting the catalog as a commercial offer.
- Create separate Supabase test users for customer and administrator review; no seeded login credentials are included.

## Screenshots

Add portfolio captures in `docs/screenshots/` before launch: desktop homepage, mobile product studio, checkout review, and admin command center.

See [the implementation plan](docs/IMPLEMENTATION_PLAN.md), [design system](docs/DESIGN_SYSTEM.md), and [admin setup notes](docs/admin-setup.md) for additional context.
#   E - c o m m e r c e  
 