import { z } from "zod";
import { productConfigurationSchema } from "@/lib/validation/configuration";

export const checkoutItemSchema = z.object({
  variantId: z.string().min(1).max(320),
  productSlug: z.string().min(1).max(160),
  quantity: z.number().int().min(1).max(50),
  configuration: productConfigurationSchema.optional(),
});

export const quoteRequestSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(40),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  discountCode: z.string().trim().max(40).optional(),
});

export const contactDetailsSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  phone: z.string().trim().max(25).refine((value) => !value || /^[+\d() .-]{7,25}$/.test(value), "Enter a valid phone number.").optional().default(""),
});

export const deliveryAddressSchema = z.object({
  line1: z.string().trim().min(3, "Enter a street address.").max(160),
  line2: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().min(2, "Enter a city.").max(100),
  region: z.string().trim().min(1, "Enter a state or region.").max(100),
  postalCode: z.string().trim().min(3, "Enter a postal code.").max(16).regex(/^[\da-z -]+$/i, "Enter a valid postal code."),
  countryCode: z.enum(["US", "CA", "GB", "IN", "AU"], "Choose a supported country."),
});

export const checkoutSessionRequestSchema = quoteRequestSchema.extend({
  contact: contactDetailsSchema,
  address: deliveryAddressSchema,
  idempotencyKey: z.string().uuid(),
});

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type CheckoutQuoteRequest = z.infer<typeof quoteRequestSchema>;
export type ContactDetails = z.infer<typeof contactDetailsSchema>;
export type DeliveryAddress = z.infer<typeof deliveryAddressSchema>;
export type CheckoutSessionRequest = z.infer<typeof checkoutSessionRequestSchema>;
