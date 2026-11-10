create table if not exists public.collections (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  eyebrow text not null default 'Collection study',
  description text not null default '',
  statement text not null default '',
  image_url text not null,
  image_alt text not null default '',
  accent_color text not null default '#bda27b',
  categories text[] not null default '{}',
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collections enable row level security;
drop policy if exists "Public can read published collections" on public.collections;
create policy "Public can read published collections" on public.collections
  for select to anon, authenticated using (is_published = true);
grant select on public.collections to anon, authenticated;

insert into public.collections (slug, name, eyebrow, description, statement, image_url, image_alt, accent_color, categories, is_featured, sort_order, is_published)
values
  ('edition-001', 'Edition 001 / The first signal', 'A first VANTA edition', 'A first study across sound, space, movement, and light.', 'A beginning is a direction, held open.', '/images/concepts/object-concept.webp', 'Sculptural brushed metal vessel in warm studio light', '#bda27b', array['objects','audio','footwear','accessories'], true, 1, true),
  ('material-memory', 'Material Memory', 'Surfaces / 01', 'Metal, stone, glass, and the marks they gather.', 'Materials remember the hands, light, and time that meet them.', '/images/concepts/living-concept.webp', 'Opal glass table lamp glowing in a dark interior', '#a99074', array['objects','living'], true, 2, true),
  ('signal-and-silence', 'Signal / Silence', 'Listening / 01', 'A listening study for the spaces between sounds.', 'Presence can be measured in what is left unsaid.', '/images/concepts/audio-concept.webp', 'Dark titanium speaker concept on a shadowed stone plinth', '#75818a', array['audio'], false, 3, true),
  ('motion-study', 'Motion Study', 'Movement / 01', 'Light forms for a life in motion.', 'A study in the distance between intention and movement.', '/images/concepts/footwear-concept.webp', 'Bone technical-knit footwear concept on mineral stone', '#b5a58c', array['footwear'], false, 4, true),
  ('light-held', 'Light, Held', 'Atmosphere / 01', 'Soft illumination made into a considered object.', 'Light changes a room before it changes what we see.', '/images/concepts/living-concept.webp', 'Opal glass table lamp glowing in a dark interior', '#c1a67a', array['living'], false, 5, true),
  ('form-of-time', 'The Form of Time', 'Instruments / 01', 'Small personal instruments and their lasting details.', 'The things we carry become a measure of the days around them.', '/images/concepts/accessories-concept.webp', 'Sculptural titanium eyewear on a warm mineral surface', '#928e78', array['accessories'], false, 6, true)
on conflict (slug) do update set
  name = excluded.name, eyebrow = excluded.eyebrow, description = excluded.description,
  statement = excluded.statement, image_url = excluded.image_url, image_alt = excluded.image_alt,
  accent_color = excluded.accent_color, categories = excluded.categories, is_featured = excluded.is_featured,
  sort_order = excluded.sort_order, is_published = excluded.is_published, updated_at = now();

create table if not exists public.drops (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  eyebrow text not null default 'Release signal',
  description text not null default '',
  product_slug text references public.products(slug) on update cascade on delete set null,
  hero_image text not null,
  hero_alt text not null default '',
  release_at timestamptz,
  ends_at timestamptz,
  notify_enabled boolean not null default true,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drops_ends_after_release check (ends_at is null or (release_at is not null and ends_at > release_at))
);

alter table public.drops enable row level security;
drop policy if exists "Public can read published drops" on public.drops;
create policy "Public can read published drops" on public.drops
  for select to anon, authenticated using (is_published = true);
grant select on public.drops to anon, authenticated;

insert into public.drops (slug, title, eyebrow, description, product_slug, hero_image, hero_alt, release_at, ends_at, notify_enabled, is_published, sort_order)
values
  ('material-memory-signal', 'A study in material memory', 'Edition / Objects', 'A closer look at the forms, surfaces, and rituals taking shape inside Material Memory. A release date has not been confirmed.', 'negative-space-vessel', '/images/concepts/object-concept.webp', 'Brushed aluminum vessel in a warm, shadowed studio', null, null, true, true, 1),
  ('signal-and-silence-listening', 'Signal / Silence', 'Edition / Audio', 'A listening object in development. Join the release list for a note when a date is confirmed.', 'resonance-one', '/images/concepts/audio-concept.webp', 'Dark titanium listening object on a stone plinth', null, null, true, true, 2),
  ('motion-study-first-form', 'Motion Study / First Form', 'Edition / Footwear', 'A movement study, still in progress. No release date has been set.', 'vector-form', '/images/concepts/footwear-concept.webp', 'Bone technical-knit footwear concept on mineral stone', null, null, true, true, 3)
on conflict (slug) do update set
  title = excluded.title, eyebrow = excluded.eyebrow, description = excluded.description,
  product_slug = excluded.product_slug, hero_image = excluded.hero_image, hero_alt = excluded.hero_alt,
  release_at = excluded.release_at, ends_at = excluded.ends_at, notify_enabled = excluded.notify_enabled,
  is_published = excluded.is_published, sort_order = excluded.sort_order, updated_at = now();

create table if not exists public.drop_notifications (
  id uuid primary key default gen_random_uuid(),
  drop_slug text not null references public.drops(slug) on update cascade on delete cascade,
  email text not null check (email = lower(email)),
  consented_at timestamptz not null,
  created_at timestamptz not null default now()
);
create unique index if not exists drop_notifications_drop_email_idx on public.drop_notifications (drop_slug, lower(email));
alter table public.drop_notifications enable row level security;
drop policy if exists "Visitors can request drop notifications" on public.drop_notifications;
create policy "Visitors can request drop notifications" on public.drop_notifications
  for insert to anon, authenticated
  with check (exists (select 1 from public.drops where drops.slug = drop_slug and drops.is_published and drops.notify_enabled));
grant insert (drop_slug, email, consented_at) on public.drop_notifications to anon, authenticated;

create table if not exists public.stories (
  slug text primary key check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  eyebrow text not null default 'VANTA journal',
  category text not null default 'Journal',
  dek text not null default '',
  hero_image text not null,
  hero_alt text not null default '',
  related_product_slug text references public.products(slug) on update cascade on delete set null,
  author text not null default 'VANTA Studio',
  read_time_minutes integer not null default 4 check (read_time_minutes > 0),
  body jsonb not null default '[]'::jsonb,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stories enable row level security;
drop policy if exists "Public can read published stories" on public.stories;
create policy "Public can read published stories" on public.stories
  for select to anon, authenticated using (is_published = true);
grant select on public.stories to anon, authenticated;

insert into public.stories (slug, title, eyebrow, category, dek, hero_image, hero_alt, related_product_slug, author, read_time_minutes, body, is_featured, is_published, sort_order, published_at)
values
  ('the-space-between', 'The Space Between', 'A thought on proportion', 'Design philosophy', 'Why the quietest part of an object can be the part that changes how we use it.', '/images/concepts/object-concept.webp', 'Sculptural metal vessel, considered through a pool of warm light', 'negative-space-vessel', 'VANTA Studio', 5,
   '[{"type":"paragraph","text":"We often begin with what an object does. It holds, carries, illuminates, or connects. The more interesting question arrives a moment later: what space does it leave around the action?"},{"type":"quote","text":"A considered object makes room for the person who meets it."},{"type":"paragraph","text":"That space is not empty. It gives a hand somewhere to rest and an eye a line to follow. It can make a familiar ritual feel newly deliberate, without asking for attention."},{"type":"image","src":"/images/products/negative-space-detail.webp","alt":"A closer view of the Negative Space Vessel surface","caption":"Negative Space Vessel / Form study"},{"type":"paragraph","text":"At VANTA, proportion is a kind of hospitality. We look for a balance between clarity and discovery, then stop before the form explains itself completely."}]'::jsonb,
   true, true, 1, '2026-10-22T10:00:00Z'),
  ('listening-to-silence', 'Listening to Silence', 'Acoustic forms / 01', 'Product documentary', 'A speaker begins as a promise of sound. Its shape also belongs to everything heard around it.', '/images/concepts/audio-concept.webp', 'Dark acoustic object against a softly lit black background', 'resonance-one', 'VANTA Studio', 6,
   '[{"type":"paragraph","text":"The first sketches for Resonance / 01 were made in the minutes before a room becomes quiet. We wanted a listening object that felt present before it made a sound, then disappeared when the music began."},{"type":"quote","text":"Sound has a shape. Silence gives it somewhere to land."},{"type":"paragraph","text":"Smoked metal carries the outer line. Acoustic mesh softens the face. The contrast is intentional: a precise outline around a surface that asks to be touched."},{"type":"image","src":"/images/products/resonance-detail.webp","alt":"Detail of the Resonance / 01 acoustic form","caption":"Resonance / 01 / Listening study"},{"type":"paragraph","text":"The object is still a study. We are listening, adjusting, and leaving the release date open until the work is ready."}]'::jsonb,
   false, true, 2, '2026-10-19T10:00:00Z'),
  ('movement-without-noise', 'Movement Without Noise', 'A lighter line forward', 'Product development', 'A footwear development journal on support, material, and the feeling of getting out of the way.', '/images/concepts/footwear-concept.webp', 'Technical-knit footwear concept on a pale mineral surface', 'vector-form', 'VANTA Studio', 4,
   '[{"type":"paragraph","text":"Movement is a negotiation between the body and the surface beneath it. Our first question was not how to add more support, but where support matters most."},{"type":"paragraph","text":"Vector Form studies a continuous upper and a shaped sole. We tested where the line could remain light and where it needed to meet the ground with confidence."},{"type":"image","src":"/images/products/vector-form-detail.webp","alt":"Side profile detail of the Vector Form footwear study","caption":"Vector Form / Movement study"},{"type":"quote","text":"The best structure is the one you notice only when it is missing."},{"type":"paragraph","text":"The development work continues. Fit, durability, and material sourcing need answers before this form can move beyond the archive."}]'::jsonb,
   false, true, 3, '2026-10-16T10:00:00Z'),
  ('light-at-the-edge-of-evening', 'Light at the Edge of Evening', 'A domestic study', 'Campaign', 'A lamp, an empty room, and the soft transition between day and night.', '/images/concepts/living-concept.webp', 'Opal glass lamp glowing in a dark interior', 'afterlight', 'VANTA Studio', 4,
   '[{"type":"paragraph","text":"Afterlight began with a familiar hour: the room is still bright enough to see, but the day has already changed its mind."},{"type":"paragraph","text":"Opal glass carries the warmth outward while a grounded base keeps the silhouette close to the surface. The intention was to make light feel held, not displayed."},{"type":"image","src":"/images/products/afterlight-detail.webp","alt":"Opal glass Afterlight lamp illuminating a quiet room","caption":"Afterlight / Light study"},{"type":"quote","text":"An atmosphere can be made from one small decision."},{"type":"paragraph","text":"The campaign is a study in domestic scale: a single pool of light, a pause in the evening, and an object that does not ask the room to change around it."}]'::jsonb,
   false, true, 4, '2026-10-11T10:00:00Z')
on conflict (slug) do update set
  title = excluded.title, eyebrow = excluded.eyebrow, category = excluded.category, dek = excluded.dek,
  hero_image = excluded.hero_image, hero_alt = excluded.hero_alt, related_product_slug = excluded.related_product_slug, author = excluded.author,
  read_time_minutes = excluded.read_time_minutes, body = excluded.body, is_featured = excluded.is_featured,
  is_published = excluded.is_published, sort_order = excluded.sort_order, published_at = excluded.published_at,
  updated_at = now();

comment on table public.collections is 'Published, editorial collection entries. Public read access is limited to published rows.';
comment on table public.drops is 'Release records; release and end timestamps are intentionally nullable until dates are confirmed.';
comment on table public.drop_notifications is 'Email consent for drop notices. Public can insert only and cannot read subscriber records.';
comment on table public.stories is 'Published VANTA editorial articles and structured body blocks.';
