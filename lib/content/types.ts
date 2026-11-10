import type { CategorySlug } from "@/lib/catalog/types";

export type EditorialCollection = {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  statement: string;
  imageUrl: string;
  imageAlt: string;
  accentColor: string;
  categories: CategorySlug[];
  isFeatured: boolean;
  sortOrder: number;
};

export type StoryBlock =
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "heading"; text: string }
  | { type: "image"; src: string; alt: string; caption?: string };

export type EditorialStory = {
  slug: string;
  title: string;
  eyebrow: string;
  category: string;
  dek: string;
  heroImage: string;
  heroAlt: string;
  relatedProductSlug: string | null;
  author: string;
  readTimeMinutes: number;
  body: StoryBlock[];
  isFeatured: boolean;
  sortOrder: number;
  publishedAt: string;
};

export type EditorialDrop = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  productSlug: string | null;
  heroImage: string;
  heroAlt: string;
  releaseAt: string | null;
  endsAt: string | null;
  notifyEnabled: boolean;
  sortOrder: number;
};

export type DropStatus = "unannounced" | "upcoming" | "active" | "past";
