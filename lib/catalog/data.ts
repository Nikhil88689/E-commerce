import type { CatalogCategory, CatalogCollection, CatalogProduct, CategorySlug } from "@/lib/catalog/types";

export const categories: CatalogCategory[] = [
  {
    slug: "objects",
    name: "Objects",
    description: "Useful forms with an unexpected point of view.",
    intro: "A study of weight, balance, and the small rituals that give a room its character.",
    heroImage: "/images/concepts/object-concept.webp",
    heroAlt: "Sculptural brushed metal vessel in warm studio light",
    collectionSlugs: ["material-memory", "edition-001"],
  },
  {
    slug: "audio",
    name: "Audio",
    description: "Sound made tangible. Presence made quiet.",
    intro: "Acoustic objects shaped for close listening, considered materials, and a quieter kind of presence.",
    heroImage: "/images/concepts/audio-concept.webp",
    heroAlt: "Dark titanium speaker concept on a shadowed stone plinth",
    collectionSlugs: ["signal-and-silence", "edition-001"],
  },
  {
    slug: "footwear",
    name: "Footwear",
    description: "A considered line between comfort and movement.",
    intro: "Movement studies in technical knit, sculpted support, and the changing pace of a city.",
    heroImage: "/images/concepts/footwear-concept.webp",
    heroAlt: "Bone technical-knit footwear concept on mineral stone",
    collectionSlugs: ["motion-study", "edition-001"],
  },
  {
    slug: "living",
    name: "Living",
    description: "Objects for the light and life between moments.",
    intro: "Light, furniture, and domestic forms built around the feeling of being at home.",
    heroImage: "/images/concepts/living-concept.webp",
    heroAlt: "Opal glass table lamp glowing in a dark interior",
    collectionSlugs: ["light-held", "material-memory"],
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "The details we carry, and the ones that stay with us.",
    intro: "Personal objects reduced to their essential lines, tactile surfaces, and daily purpose.",
    heroImage: "/images/concepts/accessories-concept.webp",
    heroAlt: "Sculptural titanium eyewear on a warm mineral surface",
    collectionSlugs: ["form-of-time", "edition-001"],
  },
];

export const collections: CatalogCollection[] = [
  {
    slug: "edition-001",
    name: "Edition 001 / The first signal",
    description: "A first study across sound, space, movement, and light.",
    image: "/images/concepts/object-concept.webp",
    categories: ["objects", "audio", "footwear", "accessories"],
  },
  {
    slug: "material-memory",
    name: "Material Memory",
    description: "Metal, stone, glass, and the marks they gather.",
    image: "/images/concepts/living-concept.webp",
    categories: ["objects", "living"],
  },
  {
    slug: "signal-and-silence",
    name: "Signal / Silence",
    description: "A listening study for the spaces between sounds.",
    image: "/images/concepts/audio-concept.webp",
    categories: ["audio"],
  },
  {
    slug: "motion-study",
    name: "Motion Study",
    description: "Light forms for a life in motion.",
    image: "/images/concepts/footwear-concept.webp",
    categories: ["footwear"],
  },
  {
    slug: "light-held",
    name: "Light, Held",
    description: "Soft illumination made into a considered object.",
    image: "/images/concepts/living-concept.webp",
    categories: ["living"],
  },
  {
    slug: "form-of-time",
    name: "The Form of Time",
    description: "Small personal instruments and their lasting details.",
    image: "/images/concepts/accessories-concept.webp",
    categories: ["accessories"],
  },
];

const color = (name: string, hex: string) => ({ name, hex });

const baseDemoProducts: CatalogProduct[] = [
  {
    id: "demo-negative-space-vessel", slug: "negative-space-vessel", name: "Negative Space Vessel", category: "objects", categoryName: "Objects",
    description: "An everyday form reconsidered through the space inside it.",
    story: "A brushed aluminum vessel with an off-center aperture that shifts as the light moves around it. A study in useful form, material memory, and the shape of empty space.",
    images: ["/images/concepts/object-concept.webp", "/images/products/negative-space-detail.webp"], imageAlt: "Brushed aluminum vessel photographed from two angles",
    materials: ["Cast aluminum", "Brushed metal"], colors: [color("Stone", "#b5ab9c"), color("Graphite", "#454745")],
    priceCents: 32000, salePriceCents: 28800, currency: "USD", stockQuantity: 14, averageRating: 4.8, ratingCount: 42, salesCount: 127, featuredRank: 1, createdAt: "2026-10-21T10:00:00.000Z", collectionSlug: "material-memory", collectionName: "Material Memory", isDemo: true,
  },
  {
    id: "demo-resonance-one", slug: "resonance-one", name: "Resonance / 01", category: "audio", categoryName: "Audio",
    description: "A listening object shaped around silence as much as sound.",
    story: "A compact acoustic column finished in smoked titanium and soft acoustic mesh. Its circular drivers bring a measured rhythm to the room, even before the first note.",
    images: ["/images/concepts/audio-concept.webp", "/images/products/resonance-detail.webp"], imageAlt: "Sculptural dark titanium speaker from the front and side",
    materials: ["Smoked titanium", "Acoustic mesh"], colors: [color("Obsidian", "#272925"), color("Champagne", "#b59d7c")],
    priceCents: 89000, salePriceCents: null, currency: "USD", stockQuantity: 3, averageRating: 4.9, ratingCount: 31, salesCount: 85, featuredRank: 2, createdAt: "2026-10-18T10:00:00.000Z", collectionSlug: "signal-and-silence", collectionName: "Signal / Silence", isDemo: true,
  },
  {
    id: "demo-vector-form", slug: "vector-form", name: "Vector Form", category: "footwear", categoryName: "Footwear",
    description: "A light, continuous silhouette for movement through the city.",
    story: "A technical knit upper and formed polymer sole meet in one long line. Vector Form is a movement study that asks how little structure a shoe needs to feel assured.",
    images: ["/images/concepts/footwear-concept.webp", "/images/products/vector-form-detail.webp"], imageAlt: "Bone knit footwear with sculpted sole shown from side and heel",
    materials: ["Technical knit", "Formed polymer"], colors: [color("Bone", "#dbd1bd"), color("Ash", "#85827a")],
    priceCents: 24500, salePriceCents: null, currency: "USD", stockQuantity: 27, averageRating: 4.7, ratingCount: 63, salesCount: 201, featuredRank: 3, createdAt: "2026-10-15T10:00:00.000Z", collectionSlug: "motion-study", collectionName: "Motion Study", isDemo: true,
  },
  {
    id: "demo-afterlight", slug: "afterlight", name: "Afterlight", category: "living", categoryName: "Living",
    description: "A quiet pool of light held just above the surface.",
    story: "Opal glass softens a warm LED above a grounded basalt base. Afterlight makes illumination feel less like a utility and more like a place to pause.",
    images: ["/images/concepts/living-concept.webp", "/images/products/afterlight-detail.webp"], imageAlt: "Opal glass lamp shown in a softly lit interior and close detail",
    materials: ["Opal glass", "Honed basalt", "Bronze"], colors: [color("Warm White", "#ded3be"), color("Basalt", "#383a36")],
    priceCents: 54000, salePriceCents: 48600, currency: "USD", stockQuantity: 0, averageRating: 4.6, ratingCount: 18, salesCount: 59, featuredRank: 4, createdAt: "2026-10-10T10:00:00.000Z", collectionSlug: "light-held", collectionName: "Light, Held", isDemo: true,
  },
  {
    id: "demo-form-01-eyewear", slug: "form-01-eyewear", name: "Form / 01 Eyewear", category: "accessories", categoryName: "Accessories",
    description: "A considered frame reduced to its quietest useful line.",
    story: "Sculpted titanium holds an optical silhouette with a light touch. A close study of balance, proportion, and the small mechanisms we use every day.",
    images: ["/images/concepts/accessories-concept.webp", "/images/products/eyewear-detail.webp"], imageAlt: "Titanium eyewear shown from the front and side on stone",
    materials: ["Titanium", "Optical acetate"], colors: [color("Silver", "#aaa9a1"), color("Olive", "#676b54")],
    priceCents: 36000, salePriceCents: null, currency: "USD", stockQuantity: 9, averageRating: 4.8, ratingCount: 24, salesCount: 93, featuredRank: 5, createdAt: "2026-10-06T10:00:00.000Z", collectionSlug: "edition-001", collectionName: "Edition 001 / The first signal", isDemo: true,
  },
  {
    id: "demo-atlas-bookends", slug: "atlas-bookends", name: "Atlas Bookends", category: "objects", categoryName: "Objects",
    description: "Two soft-edged forms that give a single volume room to stand.",
    story: "A pair of bead-blasted aluminum bookends balances an architectural profile with a warm, tactile finish. Designed as a companion to the books we return to.",
    images: ["/images/products/bookends.webp"], imageAlt: "Pair of champagne aluminum bookends holding a linen book on limestone",
    materials: ["Bead-blasted aluminum", "Limestone"], colors: [color("Champagne", "#b9a484"), color("Chalk", "#d7d0c4")],
    priceCents: 18500, salePriceCents: null, currency: "USD", stockQuantity: 8, averageRating: 4.5, ratingCount: 12, salesCount: 34, featuredRank: 6, createdAt: "2026-10-03T10:00:00.000Z", collectionSlug: "material-memory", collectionName: "Material Memory", isDemo: true,
  },
  {
    id: "demo-halo-headphones", slug: "halo-headphones", name: "Halo Headphones", category: "audio", categoryName: "Audio",
    description: "Over-ear listening with a single uninterrupted arc.",
    story: "Matte graphite titanium frames acoustic fabric ear cups in a continuous sculptural headband. A portable listening study built around fit, quiet, and focus.",
    images: ["/images/products/headphones.webp"], imageAlt: "Graphite titanium over-ear headphones on volcanic stone",
    materials: ["Graphite titanium", "Acoustic fabric"], colors: [color("Graphite", "#3b3d3c"), color("Black", "#161817")],
    priceCents: 42000, salePriceCents: 37800, currency: "USD", stockQuantity: 0, averageRating: 4.4, ratingCount: 29, salesCount: 48, featuredRank: 7, createdAt: "2026-09-28T10:00:00.000Z", collectionSlug: "signal-and-silence", collectionName: "Signal / Silence", isDemo: true,
  },
  {
    id: "demo-traverse-shoe", slug: "traverse-shoe", name: "Traverse / 01", category: "footwear", categoryName: "Footwear",
    description: "A knit trail silhouette balanced on a formed dark sole.",
    story: "Open technical knit keeps the upper light while a sculpted outsole carries a more grounded line. Traverse / 01 is a study of the city at its edges.",
    images: ["/images/products/traverse-shoe.webp"], imageAlt: "Bone technical-knit trail shoe on a pale mineral surface",
    materials: ["Technical knit", "Recycled polymer"], colors: [color("Bone", "#d7cebd"), color("Moss", "#68705d")],
    priceCents: 21800, salePriceCents: null, currency: "USD", stockQuantity: 4, averageRating: 4.6, ratingCount: 37, salesCount: 112, featuredRank: 8, createdAt: "2026-09-25T10:00:00.000Z", collectionSlug: "motion-study", collectionName: "Motion Study", isDemo: true,
  },
  {
    id: "demo-orbit-table", slug: "orbit-side-table", name: "Orbit Side Table", category: "living", categoryName: "Living",
    description: "A low oak form with a small tray held in orbit above it.",
    story: "Smoked oak grounds a satin bronze stem and floating travertine tray. Orbit keeps a lamp, a book, or a cup close without crowding the room.",
    images: ["/images/products/orbit-table.webp"], imageAlt: "Smoked oak side table with a floating travertine tray in a warm interior",
    materials: ["Smoked oak", "Travertine", "Satin bronze"], colors: [color("Walnut", "#5b3d2e"), color("Stone", "#b5aa98")],
    priceCents: 72000, salePriceCents: null, currency: "USD", stockQuantity: 6, averageRating: 4.9, ratingCount: 9, salesCount: 21, featuredRank: 9, createdAt: "2026-09-21T10:00:00.000Z", collectionSlug: "material-memory", collectionName: "Material Memory", isDemo: true,
  },
  {
    id: "demo-meridian-watch", slug: "meridian-watch", name: "Meridian Watch", category: "accessories", categoryName: "Accessories",
    description: "A small analog instrument with a calm, legible face.",
    story: "A brushed stainless case frames a smoked olive dial, pared-back indices, and a soft black leather strap. Meridian brings a measured detail to the everyday.",
    images: ["/images/products/meridian-watch.webp"], imageAlt: "Minimal brushed steel analog watch with olive dial on charcoal stone",
    materials: ["Brushed stainless steel", "Leather"], colors: [color("Olive", "#63654b"), color("Black", "#20211e")],
    priceCents: 68000, salePriceCents: 61200, currency: "USD", stockQuantity: 11, averageRating: 4.7, ratingCount: 16, salesCount: 76, featuredRank: 10, createdAt: "2026-09-18T10:00:00.000Z", collectionSlug: "form-of-time", collectionName: "The Form of Time", isDemo: true,
  },
];

type DemoExtension = {
  slug: string; name: string; category: CatalogProduct["category"]; price: number; stock: number;
  collection: string; collectionName: string; image: string; material: string; colorName: string; colorHex: string;
  secondColor: string; secondHex: string; sale?: number;
};

const categoryImages: Record<CatalogProduct["category"], string> = {
  objects: "/images/concepts/object-concept.webp",
  audio: "/images/concepts/audio-concept.webp",
  footwear: "/images/concepts/footwear-concept.webp",
  living: "/images/concepts/living-concept.webp",
  accessories: "/images/concepts/accessories-concept.webp",
};
const categoryNames: Record<CatalogProduct["category"], string> = {
  objects: "Objects", audio: "Audio", footwear: "Footwear", living: "Living", accessories: "Accessories",
};

const extensions: DemoExtension[] = [
  { slug: "arc-vessel", name: "Arc Vessel", category: "objects", price: 26800, stock: 18, collection: "material-memory", collectionName: "Material Memory", image: "/images/products/negative-space-detail.webp", material: "Cast aluminum", colorName: "Pewter", colorHex: "#85877f", secondColor: "Sand", secondHex: "#b8a992" },
  { slug: "monolith-tray", name: "Monolith Catchall", category: "objects", price: 12400, stock: 26, collection: "edition-001", collectionName: "Edition 001 / The first signal", image: "/images/products/bookends.webp", material: "Bead-blasted aluminum", colorName: "Chalk", colorHex: "#d7d0c4", secondColor: "Bronze", secondHex: "#7d6246", sale: 10800 },
  { slug: "folded-object", name: "Folded Object No. 2", category: "objects", price: 19800, stock: 7, collection: "material-memory", collectionName: "Material Memory", image: "/images/concepts/object-concept.webp", material: "Formed steel", colorName: "Graphite", colorHex: "#454745", secondColor: "Stone", secondHex: "#b5ab9c" },
  { slug: "resonance-mini", name: "Resonance / Mini", category: "audio", price: 36000, stock: 12, collection: "signal-and-silence", collectionName: "Signal / Silence", image: "/images/products/resonance-detail.webp", material: "Acoustic mesh", colorName: "Obsidian", colorHex: "#272925", secondColor: "Ash", secondHex: "#85827a" },
  { slug: "field-recorder", name: "Field Recorder", category: "audio", price: 28500, stock: 9, collection: "signal-and-silence", collectionName: "Signal / Silence", image: "/images/products/headphones.webp", material: "Anodized aluminum", colorName: "Black", colorHex: "#161817", secondColor: "Silver", secondHex: "#aaa9a1", sale: 24900 },
  { slug: "still-speaker", name: "Still / Wireless Speaker", category: "audio", price: 64000, stock: 5, collection: "edition-001", collectionName: "Edition 001 / The first signal", image: "/images/concepts/audio-concept.webp", material: "Smoked titanium", colorName: "Graphite", colorHex: "#3b3d3c", secondColor: "Champagne", secondHex: "#b59d7c" },
  { slug: "vector-form-low", name: "Vector Form / Low", category: "footwear", price: 21800, stock: 21, collection: "motion-study", collectionName: "Motion Study", image: "/images/products/vector-form-detail.webp", material: "Technical knit", colorName: "Bone", colorHex: "#dbd1bd", secondColor: "Ash", secondHex: "#85827a" },
  { slug: "drift-runner", name: "Drift Runner", category: "footwear", price: 26400, stock: 16, collection: "motion-study", collectionName: "Motion Study", image: "/images/products/traverse-shoe.webp", material: "Recycled knit", colorName: "Moss", colorHex: "#68705d", secondColor: "Bone", secondHex: "#d7cebd" },
  { slug: "transit-shell", name: "Transit Shell", category: "footwear", price: 31200, stock: 3, collection: "edition-001", collectionName: "Edition 001 / The first signal", image: "/images/concepts/footwear-concept.webp", material: "Recycled polymer", colorName: "Slate", colorHex: "#626b6d", secondColor: "Chalk", secondHex: "#d7d0c4" },
  { slug: "afterlight-portable", name: "Afterlight / Portable", category: "living", price: 38800, stock: 13, collection: "light-held", collectionName: "Light, Held", image: "/images/products/afterlight-detail.webp", material: "Opal glass", colorName: "Warm White", colorHex: "#ded3be", secondColor: "Basalt", secondHex: "#383a36" },
  { slug: "orbit-floor-light", name: "Orbit Floor Light", category: "living", price: 96000, stock: 4, collection: "light-held", collectionName: "Light, Held", image: "/images/concepts/living-concept.webp", material: "Satin bronze", colorName: "Bronze", colorHex: "#8b7154", secondColor: "Blackened steel", secondHex: "#282a28" },
  { slug: "quiet-hour-clock", name: "Quiet Hour Clock", category: "living", price: 24800, stock: 10, collection: "material-memory", collectionName: "Material Memory", image: "/images/products/meridian-watch.webp", material: "Brushed stainless steel", colorName: "Olive", colorHex: "#63654b", secondColor: "Black", secondHex: "#20211e" },
  { slug: "form-02-eyewear", name: "Form / 02 Eyewear", category: "accessories", price: 39800, stock: 15, collection: "form-of-time", collectionName: "The Form of Time", image: "/images/products/eyewear-detail.webp", material: "Titanium", colorName: "Silver", colorHex: "#aaa9a1", secondColor: "Olive", secondHex: "#676b54" },
  { slug: "meridian-strap", name: "Meridian Strap Set", category: "accessories", price: 9800, stock: 32, collection: "form-of-time", collectionName: "The Form of Time", image: "/images/products/meridian-watch.webp", material: "Vegetable-tanned leather", colorName: "Black", colorHex: "#20211e", secondColor: "Walnut", secondHex: "#5b3d2e", sale: 8200 },
  { slug: "signal-key-object", name: "Signal Key Object", category: "accessories", price: 14500, stock: 2, collection: "edition-001", collectionName: "Edition 001 / The first signal", image: "/images/concepts/accessories-concept.webp", material: "Machined titanium", colorName: "Pewter", colorHex: "#85877f", secondColor: "Black", secondHex: "#20211e" },
  { slug: "silt-stoneware", name: "Silt Stoneware", category: "objects", price: 16400, stock: 20, collection: "material-memory", collectionName: "Material Memory", image: "/images/concepts/object-concept.webp", material: "Glazed stoneware", colorName: "Silt", colorHex: "#a79c89", secondColor: "Charcoal", secondHex: "#454745" },
  { slug: "hush-earbuds", name: "Hush / In-ear", category: "audio", price: 22800, stock: 24, collection: "signal-and-silence", collectionName: "Signal / Silence", image: "/images/products/headphones.webp", material: "Ceramic composite", colorName: "Bone", colorHex: "#d7cebd", secondColor: "Graphite", secondHex: "#3b3d3c" },
  { slug: "contour-slide", name: "Contour Slide", category: "footwear", price: 15200, stock: 0, collection: "motion-study", collectionName: "Motion Study", image: "/images/products/traverse-shoe.webp", material: "Recycled polymer", colorName: "Stone", colorHex: "#b5aa98", secondColor: "Moss", secondHex: "#68705d" },
  { slug: "halo-wall-light", name: "Halo Wall Light", category: "living", price: 47200, stock: 8, collection: "light-held", collectionName: "Light, Held", image: "/images/products/afterlight-detail.webp", material: "Opal glass", colorName: "Warm White", colorHex: "#ded3be", secondColor: "Basalt", secondHex: "#383a36" },
  { slug: "index-card-case", name: "Index Card Case", category: "accessories", price: 18600, stock: 19, collection: "form-of-time", collectionName: "The Form of Time", image: "/images/products/eyewear-detail.webp", material: "Vegetable-tanned leather", colorName: "Walnut", colorHex: "#5b3d2e", secondColor: "Black", secondHex: "#20211e" },
];

const additionalDemoProducts: CatalogProduct[] = extensions.map((item, index) => ({
  id: `demo-${item.slug}`,
  slug: item.slug,
  name: item.name,
  category: item.category,
  categoryName: categoryNames[item.category],
  description: `${item.name} is a considered ${categoryNames[item.category].toLowerCase().replace(/s$/, "")} form shaped around material, balance, and everyday use.`,
  story: `A VANTA study in ${item.material.toLowerCase()} and quiet proportion. ${item.name} brings a precise detail to familiar rituals, with a tactile finish and a silhouette designed to settle naturally into its surroundings.`,
  images: [categoryImages[item.category], item.image],
  imageAlt: `${item.name}, a ${item.material.toLowerCase()} design study`,
  materials: [item.material, item.category === "footwear" ? "Recycled polymer" : "Satin-finished composite"],
  colors: [color(item.colorName, item.colorHex), color(item.secondColor, item.secondHex)],
  priceCents: item.price,
  salePriceCents: item.sale ?? null,
  currency: "USD",
  stockQuantity: item.stock,
  averageRating: Number((4.4 + (index % 6) / 10).toFixed(1)),
  ratingCount: 8 + index * 3,
  salesCount: 18 + index * 11,
  featuredRank: 11 + index,
  createdAt: `2026-11-${String(6 + index % 2).padStart(2, "0")}T10:00:00.000Z`,
  collectionSlug: item.collection,
  collectionName: item.collectionName,
  isDemo: true,
}));

export const demoProducts: CatalogProduct[] = [...baseDemoProducts, ...additionalDemoProducts];

export const categoryBySlug = (slug: string): CatalogCategory | undefined =>
  categories.find((category) => category.slug === slug);

export const isCategorySlug = (value: string | undefined): value is CategorySlug =>
  !!value && categories.some((category) => category.slug === value);
