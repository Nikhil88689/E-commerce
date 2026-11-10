import { z } from "zod";

export const productConfigurationSchema = z.object({
  source: z.enum(["product", "studio"]),
  colorName: z.string().min(1).max(60),
  colorHex: z.string().regex(/^#[\da-f]{6}$/i),
  material: z.string().min(1).max(100),
  finish: z.string().min(1).max(40),
  size: z.string().max(20).optional(),
  addOns: z.array(z.string().max(60)).max(8),
  surchargeCents: z.number().int().min(0).max(100000),
  unitPriceCents: z.number().int().min(0).max(10000000),
  summary: z.string().max(500),
});

export const saveConfigurationSchema = z.object({
  productSlug: z.string().min(1).max(160),
  configuration: productConfigurationSchema,
});

export type SavedProductConfiguration = z.infer<typeof productConfigurationSchema>;
