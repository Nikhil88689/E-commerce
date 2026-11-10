# VANTA design system

## Foundations

- **Color:** void `#090a09`, raised surfaces `#101210` and `#171a17`, warm paper `#e5e1d7`, warm white `#f0eee8`, muted text `#999b95`, and champagne accent `#bda27b`.
- **Typography:** Manrope for interface and body copy, Cormorant Garamond for editorial contrast, and DM Mono for metadata. Fonts are bundled with `next/font`.
- **Spacing:** `--space-1` through `--space-8` provide the base scale; page gutters use `clamp()` and adapt at the 1120, 820, and 600 px breakpoints.
- **Motion:** fast 180 ms, base 420 ms, slow 760 ms, with shared cubic-bezier easing. Motion components and GSAP effects honor `prefers-reduced-motion`.

## Components

- Buttons: `primary`, `secondary`, `outline`, and `ghost`, with `small` and `medium` sizing.
- Inputs: dark surface, low-contrast border, warm focus ring, explicit error text, and consent controls.
- Cards: image-led concept cards and category cards use consistent metadata, image treatment, and keyboard-accessible actions.
- Navigation: persistent desktop bar, full-screen mega menu, search overlay, bag and account drawers, and an intentional mobile drawer.
- Dialogs: native `<dialog>` supplies modal focus management and Escape handling; variants cover centered details, edge drawers, and full-screen overlays.
- Page transitions: the storefront template uses Motion for a brief route entrance; reduced-motion users receive an immediate transition.
- Loading: a session-scoped 1.5-second brand introduction runs once per tab; route loading and error boundaries remain available as fallbacks.

## Content state

The homepage remains an editorial concept archive. The Discover and product detail routes use a clearly labeled ten item demo catalog with sample prices, sale prices, inventory, and ratings. Quick add and wishlist work in the browser, while checkout and payment remain disabled. The Supabase catalog schema and seed are in `supabase/migrations/20261108000000_catalog.sql`; without Supabase credentials the same sample data is served locally. Newsletter signups require configured Supabase credentials, the newsletter migration, and a public privacy contact; no email delivery provider is currently connected.
