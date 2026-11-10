import { z } from "zod";

const slugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens.");
const textList = z.array(z.string().trim().min(1).max(100)).max(30);
const mediaUrl = z.string().trim().min(1).max(1000).refine((value) => {
  if (/^\/(?!\/)[^\\\u0000-\u001f]*$/.test(value)) return true;
  try {
    const parsed = new URL(value);
    const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL) : null;
    return !parsed.username && !parsed.password && !!supabase
      && parsed.origin === supabase.origin && parsed.pathname.startsWith("/storage/v1/object/public/");
  } catch { return false; }
}, "Use a local asset path or a public VANTA storage URL.");

export const adminVariantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(2).max(80).regex(/^[A-Z0-9._-]+$/i),
  name: z.string().trim().min(1).max(100),
  options: z.record(z.string(), z.string().max(80)).default({}),
  priceAdjustmentCents: z.number().int().min(-100000).max(1000000).default(0),
  stockQuantity: z.number().int().min(0).max(1000000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});

export const adminProductSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(5).max(2000),
  story: z.string().trim().max(5000).default(""),
  categorySlug: z.enum(["objects", "audio", "footwear", "living", "accessories"]),
  images: z.array(mediaUrl).min(1).max(12),
  imageAlt: z.string().trim().min(5).max(300),
  materials: textList,
  colors: z.array(z.object({ name: z.string().trim().min(1).max(50), hex: z.string().regex(/^#[0-9a-f]{6}$/i) })).max(20),
  priceCents: z.number().int().min(0).max(100000000),
  salePriceCents: z.number().int().min(0).max(100000000).nullable(),
  stockQuantity: z.number().int().min(0).max(1000000),
  collectionSlug: slugSchema,
  collectionName: z.string().trim().min(1).max(160),
  isPublished: z.boolean(),
  isFeatured: z.boolean(),
  featuredRank: z.number().int().min(1).max(10000),
  modelUrl: mediaUrl.nullable(),
  variants: z.array(adminVariantSchema).max(100),
})
  .refine((value) => value.salePriceCents === null || value.salePriceCents < value.priceCents, { path: ["salePriceCents"], message: "Sale price must be below the regular price." })
  .refine((value) => value.variants.every((variant) => (value.salePriceCents ?? value.priceCents) + variant.priceAdjustmentCents >= 0), { path: ["variants"], message: "A variant adjustment cannot make the selling price negative." });

export const adminFulfillmentSchema = z.object({
  fulfillmentStatus: z.enum(["unfulfilled", "processing", "shipped", "delivered", "cancelled", "returned"]),
  carrier: z.string().trim().max(100).default(""),
  trackingNumber: z.string().trim().max(160).default(""),
  trackingUrl: z.string().trim().max(1000).refine((value) => !value || /^https:\/\//i.test(value), "Use a secure https tracking link.").default(""),
  note: z.string().trim().min(3).max(500),
});

export const inventoryAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().default(null),
  delta: z.number().int().min(-1000000).max(1000000).refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(300),
  reference: z.string().trim().max(160).default(""),
});

export const adminDiscountSchema = z.object({
  code: z.string().trim().toUpperCase().min(3).max(40).regex(/^[A-Z0-9_-]+$/),
  discountType: z.enum(["percent", "fixed"]),
  amount: z.number().int().min(1).max(100000000),
  minimumSubtotalCents: z.number().int().min(0).max(100000000).default(0),
  maximumDiscountCents: z.number().int().min(0).max(100000000).nullable().default(null),
  usageLimit: z.number().int().min(1).max(100000000).nullable().default(null),
  startsAt: z.string().datetime().nullable().default(null),
  expiresAt: z.string().datetime().nullable().default(null),
  active: z.boolean().default(true),
}).refine((value) => value.discountType !== "percent" || value.amount <= 100, { path: ["amount"], message: "Percentage discounts cannot exceed 100%." }).refine((value) => !value.startsAt || !value.expiresAt || value.expiresAt > value.startsAt, { path: ["expiresAt"], message: "Expiration must follow the start time." });

export const adminCollectionSchema = z.object({
  slug: slugSchema, name: z.string().trim().min(2).max(160), eyebrow: z.string().trim().max(120),
  description: z.string().trim().max(1000), statement: z.string().trim().max(1200), imageUrl: mediaUrl,
  imageAlt: z.string().trim().max(300), accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  categories: z.array(z.enum(["objects", "audio", "footwear", "living", "accessories"])).max(5),
  isFeatured: z.boolean(), sortOrder: z.number().int().min(0).max(10000), isPublished: z.boolean(),
});

export const storyBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text: z.string().trim().min(1).max(5000) }),
  z.object({ type: z.literal("quote"), text: z.string().trim().min(1).max(1000) }),
  z.object({ type: z.literal("heading"), text: z.string().trim().min(1).max(180) }),
  z.object({ type: z.literal("image"), src: mediaUrl, alt: z.string().trim().min(3).max(300), caption: z.string().trim().max(200).optional() }),
]);

export const adminStorySchema = z.object({
  slug: slugSchema, title: z.string().trim().min(2).max(180), eyebrow: z.string().trim().max(140), category: z.string().trim().min(2).max(80),
  dek: z.string().trim().min(5).max(600), heroImage: mediaUrl, heroAlt: z.string().trim().min(5).max(300),
  relatedProductSlug: slugSchema.nullable(), author: z.string().trim().min(2).max(120), readTimeMinutes: z.number().int().min(1).max(90),
  body: z.array(storyBlockSchema).min(1).max(80), isFeatured: z.boolean(), isPublished: z.boolean(), sortOrder: z.number().int().min(0).max(10000), publishedAt: z.string().datetime(),
});

export const adminDropSchema = z.object({
  slug: slugSchema, title: z.string().trim().min(2).max(180), eyebrow: z.string().trim().max(120), description: z.string().trim().min(5).max(2000),
  productSlug: slugSchema.nullable(), heroImage: mediaUrl, heroAlt: z.string().trim().min(5).max(300),
  releaseAt: z.string().datetime().nullable(), endsAt: z.string().datetime().nullable(), notifyEnabled: z.boolean(), isPublished: z.boolean(), sortOrder: z.number().int().min(0).max(10000),
}).refine((value) => !value.endsAt || (value.releaseAt !== null && value.endsAt > value.releaseAt), { path: ["endsAt"], message: "End time must follow a configured release timestamp." });

export const adminHomepageSectionSchema = z.object({
  sectionKey: slugSchema, title: z.string().trim().min(2).max(160), content: z.record(z.string(), z.unknown()),
  enabled: z.boolean(), sortOrder: z.number().int().min(0).max(10000),
});
