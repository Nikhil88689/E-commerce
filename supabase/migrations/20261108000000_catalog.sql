create table if not exists public.categories (
  slug text primary key,
  name text not null,
  description text not null default '',
  intro text not null default '',
  hero_image text not null,
  hero_alt text not null,
  collection_slugs text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  story text not null default '',
  category_slug text not null references public.categories(slug) on update cascade,
  images text[] not null default '{}',
  image_alt text not null default '',
  materials text[] not null default '{}',
  colors text[] not null default '{}',
  color_swatches jsonb not null default '[]'::jsonb,
  price_cents integer not null check (price_cents >= 0),
  sale_price_cents integer check (sale_price_cents is null or (sale_price_cents >= 0 and sale_price_cents < price_cents)),
  effective_price_cents integer generated always as (coalesce(sale_price_cents, price_cents)) stored,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  average_rating numeric(2,1) not null default 0 check (average_rating >= 0 and average_rating <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  sales_count integer not null default 0 check (sales_count >= 0),
  featured_rank integer not null default 999,
  collection_slug text not null default 'edition-001',
  collection_name text not null default 'Edition 001 / The first signal',
  is_published boolean not null default false,
  is_demo boolean not null default false,
  search_document tsvector generated always as (
    to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(story, '') || ' ' || coalesce(category_slug, '') || ' ' || array_to_string(materials, ' ') || ' ' || array_to_string(colors, ' '))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_public_category_idx on public.products (category_slug, featured_rank) where is_published;
create index if not exists products_public_price_idx on public.products (effective_price_cents) where is_published;
create index if not exists products_public_stock_idx on public.products (stock_quantity) where is_published;
create index if not exists products_search_document_idx on public.products using gin (search_document);
create index if not exists products_colors_idx on public.products using gin (colors);
create index if not exists products_materials_idx on public.products using gin (materials);

alter table public.categories enable row level security;
alter table public.products enable row level security;

drop policy if exists "Public can read catalog categories" on public.categories;
create policy "Public can read catalog categories"
  on public.categories for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products"
  on public.products for select
  to anon, authenticated
  using (is_published = true);

insert into public.categories (slug, name, description, intro, hero_image, hero_alt, collection_slugs, sort_order)
values
  ('objects', 'Objects', 'Useful forms with an unexpected point of view.', 'A study of weight, balance, and the small rituals that give a room its character.', '/images/concepts/object-concept.webp', 'Sculptural brushed metal vessel in warm studio light', array['material-memory','edition-001'], 1),
  ('audio', 'Audio', 'Sound made tangible. Presence made quiet.', 'Acoustic objects shaped for close listening, considered materials, and a quieter kind of presence.', '/images/concepts/audio-concept.webp', 'Dark titanium speaker concept on a shadowed stone plinth', array['signal-and-silence','edition-001'], 2),
  ('footwear', 'Footwear', 'A considered line between comfort and movement.', 'Movement studies in technical knit, sculpted support, and the changing pace of a city.', '/images/concepts/footwear-concept.webp', 'Bone technical-knit footwear concept on mineral stone', array['motion-study','edition-001'], 3),
  ('living', 'Living', 'Objects for the light and life between moments.', 'Light, furniture, and domestic forms built around the feeling of being at home.', '/images/concepts/living-concept.webp', 'Opal glass table lamp glowing in a dark interior', array['light-held','material-memory'], 4),
  ('accessories', 'Accessories', 'The details we carry, and the ones that stay with us.', 'Personal objects reduced to their essential lines, tactile surfaces, and daily purpose.', '/images/concepts/accessories-concept.webp', 'Sculptural titanium eyewear on a warm mineral surface', array['form-of-time','edition-001'], 5)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  intro = excluded.intro,
  hero_image = excluded.hero_image,
  hero_alt = excluded.hero_alt,
  collection_slugs = excluded.collection_slugs,
  sort_order = excluded.sort_order;

insert into public.products (
  slug, name, description, story, category_slug, images, image_alt, materials, colors, color_swatches,
  price_cents, sale_price_cents, stock_quantity, average_rating, rating_count, sales_count, featured_rank,
  collection_slug, collection_name, is_published, is_demo, created_at
)
values
  ('negative-space-vessel', 'Negative Space Vessel', 'An everyday form reconsidered through the space inside it.', 'A brushed aluminum vessel with an off-center aperture that shifts as the light moves around it. A study in useful form, material memory, and the shape of empty space.', 'objects', array['/images/concepts/object-concept.webp','/images/products/negative-space-detail.webp'], 'Brushed aluminum vessel photographed from two angles', array['Cast aluminum','Brushed metal'], array['Stone','Graphite'], '[{"name":"Stone","hex":"#b5ab9c"},{"name":"Graphite","hex":"#454745"}]'::jsonb, 32000, 28800, 14, 4.8, 42, 127, 1, 'material-memory', 'Material Memory', true, true, '2026-10-21T10:00:00Z'),
  ('resonance-one', 'Resonance / 01', 'A listening object shaped around silence as much as sound.', 'A compact acoustic column finished in smoked titanium and soft acoustic mesh. Its circular drivers bring a measured rhythm to the room, even before the first note.', 'audio', array['/images/concepts/audio-concept.webp','/images/products/resonance-detail.webp'], 'Sculptural dark titanium speaker from two angles', array['Smoked titanium','Acoustic mesh'], array['Obsidian','Champagne'], '[{"name":"Obsidian","hex":"#272925"},{"name":"Champagne","hex":"#b59d7c"}]'::jsonb, 89000, null, 3, 4.9, 31, 85, 2, 'signal-and-silence', 'Signal / Silence', true, true, '2026-10-18T10:00:00Z'),
  ('vector-form', 'Vector Form', 'A light, continuous silhouette for movement through the city.', 'A technical knit upper and formed polymer sole meet in one long line. Vector Form is a movement study that asks how little structure a shoe needs to feel assured.', 'footwear', array['/images/concepts/footwear-concept.webp','/images/products/vector-form-detail.webp'], 'Bone knit footwear with sculpted sole from side and heel', array['Technical knit','Formed polymer'], array['Bone','Ash'], '[{"name":"Bone","hex":"#dbd1bd"},{"name":"Ash","hex":"#85827a"}]'::jsonb, 24500, null, 27, 4.7, 63, 201, 3, 'motion-study', 'Motion Study', true, true, '2026-10-15T10:00:00Z'),
  ('afterlight', 'Afterlight', 'A quiet pool of light held just above the surface.', 'Opal glass softens a warm LED above a grounded basalt base. Afterlight makes illumination feel less like a utility and more like a place to pause.', 'living', array['/images/concepts/living-concept.webp','/images/products/afterlight-detail.webp'], 'Opal glass lamp in a softly lit interior and close detail', array['Opal glass','Honed basalt','Bronze'], array['Warm White','Basalt'], '[{"name":"Warm White","hex":"#ded3be"},{"name":"Basalt","hex":"#383a36"}]'::jsonb, 54000, 48600, 0, 4.6, 18, 59, 4, 'light-held', 'Light, Held', true, true, '2026-10-10T10:00:00Z'),
  ('form-01-eyewear', 'Form / 01 Eyewear', 'A considered frame reduced to its quietest useful line.', 'Sculpted titanium holds an optical silhouette with a light touch. A close study of balance, proportion, and the small mechanisms we use every day.', 'accessories', array['/images/concepts/accessories-concept.webp','/images/products/eyewear-detail.webp'], 'Titanium eyewear from the front and side on stone', array['Titanium','Optical acetate'], array['Silver','Olive'], '[{"name":"Silver","hex":"#aaa9a1"},{"name":"Olive","hex":"#676b54"}]'::jsonb, 36000, null, 9, 4.8, 24, 93, 5, 'edition-001', 'Edition 001 / The first signal', true, true, '2026-10-06T10:00:00Z'),
  ('atlas-bookends', 'Atlas Bookends', 'Two soft-edged forms that give a single volume room to stand.', 'A pair of bead-blasted aluminum bookends balances an architectural profile with a warm, tactile finish. Designed as a companion to the books we return to.', 'objects', array['/images/products/bookends.webp'], 'Champagne aluminum bookends holding a linen book on limestone', array['Bead-blasted aluminum','Limestone'], array['Champagne','Chalk'], '[{"name":"Champagne","hex":"#b9a484"},{"name":"Chalk","hex":"#d7d0c4"}]'::jsonb, 18500, null, 8, 4.5, 12, 34, 6, 'material-memory', 'Material Memory', true, true, '2026-10-03T10:00:00Z'),
  ('halo-headphones', 'Halo Headphones', 'Over-ear listening with a single uninterrupted arc.', 'Matte graphite titanium frames acoustic fabric ear cups in a continuous sculptural headband. A portable listening study built around fit, quiet, and focus.', 'audio', array['/images/products/headphones.webp'], 'Graphite titanium over-ear headphones on volcanic stone', array['Graphite titanium','Acoustic fabric'], array['Graphite','Black'], '[{"name":"Graphite","hex":"#3b3d3c"},{"name":"Black","hex":"#161817"}]'::jsonb, 42000, 37800, 0, 4.4, 29, 48, 7, 'signal-and-silence', 'Signal / Silence', true, true, '2026-09-28T10:00:00Z'),
  ('traverse-shoe', 'Traverse / 01', 'A knit trail silhouette balanced on a formed dark sole.', 'Open technical knit keeps the upper light while a sculpted outsole carries a more grounded line. Traverse / 01 is a study of the city at its edges.', 'footwear', array['/images/products/traverse-shoe.webp'], 'Bone technical-knit trail shoe on a pale mineral surface', array['Technical knit','Recycled polymer'], array['Bone','Moss'], '[{"name":"Bone","hex":"#d7cebd"},{"name":"Moss","hex":"#68705d"}]'::jsonb, 21800, null, 4, 4.6, 37, 112, 8, 'motion-study', 'Motion Study', true, true, '2026-09-25T10:00:00Z'),
  ('orbit-side-table', 'Orbit Side Table', 'A low oak form with a small tray held in orbit above it.', 'Smoked oak grounds a satin bronze stem and floating travertine tray. Orbit keeps a lamp, a book, or a cup close without crowding the room.', 'living', array['/images/products/orbit-table.webp'], 'Smoked oak side table with a floating travertine tray in a warm interior', array['Smoked oak','Travertine','Satin bronze'], array['Walnut','Stone'], '[{"name":"Walnut","hex":"#5b3d2e"},{"name":"Stone","hex":"#b5aa98"}]'::jsonb, 72000, null, 6, 4.9, 9, 21, 9, 'material-memory', 'Material Memory', true, true, '2026-09-21T10:00:00Z'),
  ('meridian-watch', 'Meridian Watch', 'A small analog instrument with a calm, legible face.', 'A brushed stainless case frames a smoked olive dial, pared-back indices, and a soft black leather strap. Meridian brings a measured detail to the everyday.', 'accessories', array['/images/products/meridian-watch.webp'], 'Minimal brushed steel watch with olive dial on charcoal stone', array['Brushed stainless steel','Leather'], array['Olive','Black'], '[{"name":"Olive","hex":"#63654b"},{"name":"Black","hex":"#20211e"}]'::jsonb, 68000, 61200, 11, 4.7, 16, 76, 10, 'form-of-time', 'The Form of Time', true, true, '2026-09-18T10:00:00Z')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  story = excluded.story,
  category_slug = excluded.category_slug,
  images = excluded.images,
  image_alt = excluded.image_alt,
  materials = excluded.materials,
  colors = excluded.colors,
  color_swatches = excluded.color_swatches,
  price_cents = excluded.price_cents,
  sale_price_cents = excluded.sale_price_cents,
  stock_quantity = excluded.stock_quantity,
  average_rating = excluded.average_rating,
  rating_count = excluded.rating_count,
  sales_count = excluded.sales_count,
  featured_rank = excluded.featured_rank,
  collection_slug = excluded.collection_slug,
  collection_name = excluded.collection_name,
  is_published = excluded.is_published,
  is_demo = excluded.is_demo,
  created_at = excluded.created_at,
  updated_at = now();
