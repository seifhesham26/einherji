import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  jobTitle: z.string().max(100).optional(),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export const updateIntegrationsSchema = z.object({
  apifyApiToken: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateIntegrationsInput = z.infer<typeof updateIntegrationsSchema>;
