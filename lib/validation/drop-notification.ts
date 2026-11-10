import { z } from "zod";

export const dropNotificationSchema = z.object({
  dropSlug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  consent: z.literal(true, { error: "Please agree to receive drop updates." }),
  company: z.string().max(200).optional().default(""),
});

export const dropNotificationFormSchema = dropNotificationSchema.omit({ dropSlug: true });
