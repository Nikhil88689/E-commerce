import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().trim().email().max(320),
  consent: z.literal(true),
  company: z.string().max(160).optional(),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;
