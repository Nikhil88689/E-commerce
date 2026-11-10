import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(128),
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export const passwordResetSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name.").max(120),
  phone: z.string().trim().max(25).refine((value) => !value || /^[+\d() .-]{7,25}$/.test(value), "Enter a valid phone number."),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  emailMarketing: z.boolean(),
  orderUpdates: z.boolean(),
});

export const passwordChangeSchema = z.object({
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match.",
});

export const accountAddressSchema = z.object({
  recipient: z.string().trim().min(2).max(120),
  line1: z.string().trim().min(3).max(160),
  line2: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().min(2).max(100),
  region: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(3).max(16).regex(/^[\da-z -]+$/i, "Enter a valid postal code."),
  countryCode: z.enum(["US", "CA", "GB", "IN", "AU"]),
  isDefault: z.boolean().default(false),
});

export const wishlistMutationSchema = z.object({
  productSlug: z.string().trim().min(1).max(160).regex(/^[a-z0-9-]+$/),
});
