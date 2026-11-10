export type Concept = {
  id: string;
  name: string;
  category: string;
  image: string;
  imageAlt: string;
  material: string;
  description: string;
  detail: string;
};

export const concepts: Concept[] = [
  {
    id: "resonance-one",
    name: "Resonance / 01",
    category: "Audio",
    image: "/images/concepts/audio-concept.webp",
    imageAlt: "Unbranded dark metal speaker prototype with two circular drivers",
    material: "Smoked titanium · acoustic mesh",
    description: "A listening object shaped around silence as much as sound.",
    detail:
      "A study in acoustic presence: a compact column, twin circular forms, and a surface that catches the room without asking for attention. This is a visual concept, not a finished or available product.",
  },
  {
    id: "negative-space-vessel",
    name: "Negative Space",
    category: "Objects",
    image: "/images/concepts/object-concept.webp",
    imageAlt: "Sculptural brushed metal vessel prototype on a limestone plinth",
    material: "Cast aluminum · brushed finish",
    description: "An everyday form reconsidered through the space inside it.",
    detail:
      "The vessel turns its opening into the main gesture. Its off-center aperture changes with every angle, making the empty space feel as deliberate as the material around it. This is a visual concept, not a finished or available product.",
  },
  {
    id: "vector-form",
    name: "Vector Form",
    category: "Footwear",
    image: "/images/concepts/footwear-concept.webp",
    imageAlt: "Bone-colored knit footwear prototype with a sculpted sole",
    material: "Technical knit · formed polymer",
    description: "A light, continuous silhouette for movement through the city.",
    detail:
      "A footwear study that reduces the visible joins between upper and sole. A single sculpted line carries the eye from heel to toe. This is a visual concept, not a finished or available product.",
  },
  {
    id: "afterlight",
    name: "Afterlight",
    category: "Living",
    image: "/images/concepts/living-concept.webp",
    imageAlt: "Warm glowing opal glass table lamp concept on a dark stone base",
    material: "Opal glass · honed basalt · bronze",
    description: "A quiet pool of light held just above the surface.",
    detail:
      "Afterlight explores illumination as an object in its own right: a softened opal shade, a slender stem, and a grounded stone base. This is a visual concept, not a finished or available product.",
  },
];

export type ProductWorld = {
  id: string;
  name: string;
  descriptor: string;
  image: string;
  imageAlt: string;
  tone: "stone" | "night" | "silver" | "ember" | "sand";
  category: string;
};

export const productWorlds: ProductWorld[] = [
  {
    id: "objects",
    name: "Objects",
    descriptor: "Form with a point of view",
    image: "/images/concepts/object-concept.webp",
    imageAlt: "Brushed metal vessel concept in warm stone light",
    tone: "stone",
    category: "Objects",
  },
  {
    id: "audio",
    name: "Audio",
    descriptor: "A different kind of presence",
    image: "/images/concepts/audio-concept.webp",
    imageAlt: "Sculptural speaker concept against a dark studio backdrop",
    tone: "night",
    category: "Audio",
  },
  {
    id: "footwear",
    name: "Footwear",
    descriptor: "Made for moving forward",
    image: "/images/concepts/footwear-concept.webp",
    imageAlt: "Minimal footwear concept in profile on a charcoal floor",
    tone: "silver",
    category: "Footwear",
  },
  {
    id: "living",
    name: "Living",
    descriptor: "A softer kind of light",
    image: "/images/concepts/living-concept.webp",
    imageAlt: "Sculptural table lamp concept with a warm opal shade",
    tone: "ember",
    category: "Living",
  },
  {
    id: "accessories",
    name: "Accessories",
    descriptor: "Details that stay with you",
    image: "/images/concepts/accessories-concept.webp",
    imageAlt: "Minimal titanium eyewear concept on a mineral surface",
    tone: "sand",
    category: "Accessories",
  },
];

export const searchEntries = [
  ...concepts.map((concept) => ({
    label: concept.name,
    detail: `${concept.category} · Concept archive`,
    href: `/#concept-${concept.id}`,
    keywords: `${concept.name} ${concept.category} ${concept.description}`.toLowerCase(),
  })),
  {
    label: "The VANTA point of view",
    detail: "Brand story",
    href: "/#story",
    keywords: "brand story philosophy point of view vanta",
  },
  {
    label: "The first collection",
    detail: "Collection study",
    href: "/#collection",
    keywords: "collection edition archive first collection",
  },
  {
    label: "Release notes",
    detail: "Drops",
    href: "/#drops",
    keywords: "release drop launch date upcoming",
  },
];
