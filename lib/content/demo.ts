import { collections as catalogCollections } from "@/lib/catalog/data";
import type { EditorialCollection, EditorialDrop, EditorialStory } from "@/lib/content/types";

const editorialDetails: Record<string, Pick<EditorialCollection, "eyebrow" | "statement" | "imageAlt" | "accentColor" | "isFeatured" | "sortOrder">> = {
  "edition-001": { eyebrow: "A first VANTA edition", statement: "A beginning is a direction, held open.", imageAlt: "Sculptural brushed metal vessel in warm studio light", accentColor: "#bda27b", isFeatured: true, sortOrder: 1 },
  "material-memory": { eyebrow: "Surfaces / 01", statement: "Materials remember the hands, light, and time that meet them.", imageAlt: "Opal glass table lamp glowing in a dark interior", accentColor: "#a99074", isFeatured: true, sortOrder: 2 },
  "signal-and-silence": { eyebrow: "Listening / 01", statement: "Presence can be measured in what is left unsaid.", imageAlt: "Dark titanium speaker concept on a shadowed stone plinth", accentColor: "#75818a", isFeatured: false, sortOrder: 3 },
  "motion-study": { eyebrow: "Movement / 01", statement: "A study in the distance between intention and movement.", imageAlt: "Bone technical-knit footwear concept on mineral stone", accentColor: "#b5a58c", isFeatured: false, sortOrder: 4 },
  "light-held": { eyebrow: "Atmosphere / 01", statement: "Light changes a room before it changes what we see.", imageAlt: "Opal glass table lamp glowing in a dark interior", accentColor: "#c1a67a", isFeatured: false, sortOrder: 5 },
  "form-of-time": { eyebrow: "Instruments / 01", statement: "The things we carry become a measure of the days around them.", imageAlt: "Sculptural titanium eyewear on a warm mineral surface", accentColor: "#928e78", isFeatured: false, sortOrder: 6 },
};

export const demoCollections: EditorialCollection[] = catalogCollections.map((collection) => ({
  ...collection,
  ...editorialDetails[collection.slug],
  imageUrl: collection.image,
}));

export const demoDrops: EditorialDrop[] = [
  { slug: "material-memory-signal", title: "A study in material memory", eyebrow: "Edition / Objects", description: "A closer look at the forms, surfaces, and rituals taking shape inside Material Memory. A release date has not been confirmed.", productSlug: "negative-space-vessel", heroImage: "/images/concepts/object-concept.webp", heroAlt: "Brushed aluminum vessel in a warm, shadowed studio", releaseAt: null, endsAt: null, notifyEnabled: true, sortOrder: 1 },
  { slug: "signal-and-silence-listening", title: "Signal / Silence", eyebrow: "Edition / Audio", description: "A listening object in development. Join the release list for a note when a date is confirmed.", productSlug: "resonance-one", heroImage: "/images/concepts/audio-concept.webp", heroAlt: "Dark titanium listening object on a stone plinth", releaseAt: null, endsAt: null, notifyEnabled: true, sortOrder: 2 },
  { slug: "motion-study-first-form", title: "Motion Study / First Form", eyebrow: "Edition / Footwear", description: "A movement study, still in progress. No release date has been set.", productSlug: "vector-form", heroImage: "/images/concepts/footwear-concept.webp", heroAlt: "Bone technical-knit footwear concept on mineral stone", releaseAt: null, endsAt: null, notifyEnabled: true, sortOrder: 3 },
];

export const demoStories: EditorialStory[] = [
  {
    slug: "the-space-between", title: "The Space Between", eyebrow: "A thought on proportion", category: "Design philosophy",
    dek: "Why the quietest part of an object can be the part that changes how we use it.",
    heroImage: "/images/concepts/object-concept.webp", heroAlt: "Sculptural metal vessel, considered through a pool of warm light",
    relatedProductSlug: "negative-space-vessel",
    author: "VANTA Studio", readTimeMinutes: 5, isFeatured: true, sortOrder: 1, publishedAt: "2026-10-22T10:00:00.000Z",
    body: [
      { type: "paragraph", text: "We often begin with what an object does. It holds, carries, illuminates, or connects. The more interesting question arrives a moment later: what space does it leave around the action?" },
      { type: "quote", text: "A considered object makes room for the person who meets it." },
      { type: "paragraph", text: "That space is not empty. It gives a hand somewhere to rest and an eye a line to follow. It can make a familiar ritual feel newly deliberate, without asking for attention." },
      { type: "image", src: "/images/products/negative-space-detail.webp", alt: "A closer view of the Negative Space Vessel surface", caption: "Negative Space Vessel / Form study" },
      { type: "paragraph", text: "At VANTA, proportion is a kind of hospitality. We look for a balance between clarity and discovery, then stop before the form explains itself completely." },
    ],
  },
  {
    slug: "listening-to-silence", title: "Listening to Silence", eyebrow: "Acoustic forms / 01", category: "Product documentary",
    dek: "A speaker begins as a promise of sound. Its shape also belongs to everything heard around it.",
    heroImage: "/images/concepts/audio-concept.webp", heroAlt: "Dark acoustic object against a softly lit black background",
    relatedProductSlug: "resonance-one",
    author: "VANTA Studio", readTimeMinutes: 6, isFeatured: false, sortOrder: 2, publishedAt: "2026-10-19T10:00:00.000Z",
    body: [
      { type: "paragraph", text: "The first sketches for Resonance / 01 were made in the minutes before a room becomes quiet. We wanted a listening object that felt present before it made a sound, then disappeared when the music began." },
      { type: "quote", text: "Sound has a shape. Silence gives it somewhere to land." },
      { type: "paragraph", text: "Smoked metal carries the outer line. Acoustic mesh softens the face. The contrast is intentional: a precise outline around a surface that asks to be touched." },
      { type: "image", src: "/images/products/resonance-detail.webp", alt: "Detail of the Resonance / 01 acoustic form", caption: "Resonance / 01 / Listening study" },
      { type: "paragraph", text: "The object is still a study. We are listening, adjusting, and leaving the release date open until the work is ready." },
    ],
  },
  {
    slug: "movement-without-noise", title: "Movement Without Noise", eyebrow: "A lighter line forward", category: "Product development",
    dek: "A footwear development journal on support, material, and the feeling of getting out of the way.",
    heroImage: "/images/concepts/footwear-concept.webp", heroAlt: "Technical-knit footwear concept on a pale mineral surface",
    relatedProductSlug: "vector-form",
    author: "VANTA Studio", readTimeMinutes: 4, isFeatured: false, sortOrder: 3, publishedAt: "2026-10-16T10:00:00.000Z",
    body: [
      { type: "paragraph", text: "Movement is a negotiation between the body and the surface beneath it. Our first question was not how to add more support, but where support matters most." },
      { type: "paragraph", text: "Vector Form studies a continuous upper and a shaped sole. We tested where the line could remain light and where it needed to meet the ground with confidence." },
      { type: "image", src: "/images/products/vector-form-detail.webp", alt: "Side profile detail of the Vector Form footwear study", caption: "Vector Form / Movement study" },
      { type: "quote", text: "The best structure is the one you notice only when it is missing." },
      { type: "paragraph", text: "The development work continues. Fit, durability, and material sourcing need answers before this form can move beyond the archive." },
    ],
  },
  {
    slug: "light-at-the-edge-of-evening", title: "Light at the Edge of Evening", eyebrow: "A domestic study", category: "Campaign",
    dek: "A lamp, an empty room, and the soft transition between day and night.",
    heroImage: "/images/concepts/living-concept.webp", heroAlt: "Opal glass lamp glowing in a dark interior",
    relatedProductSlug: "afterlight",
    author: "VANTA Studio", readTimeMinutes: 4, isFeatured: false, sortOrder: 4, publishedAt: "2026-10-11T10:00:00.000Z",
    body: [
      { type: "paragraph", text: "Afterlight began with a familiar hour: the room is still bright enough to see, but the day has already changed its mind." },
      { type: "paragraph", text: "Opal glass carries the warmth outward while a grounded base keeps the silhouette close to the surface. The intention was to make light feel held, not displayed." },
      { type: "image", src: "/images/products/afterlight-detail.webp", alt: "Opal glass Afterlight lamp illuminating a quiet room", caption: "Afterlight / Light study" },
      { type: "quote", text: "An atmosphere can be made from one small decision." },
      { type: "paragraph", text: "The campaign is a study in domestic scale: a single pool of light, a pause in the evening, and an object that does not ask the room to change around it." },
    ],
  },
];
