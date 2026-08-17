import { z } from "zod";
import { jobSourceNameSchema } from "@/lib/scrapers/job-source.types";

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  jobTitle: z.string().max(100).optional(),
  linkedinUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export const updateIntegrationsSchema = z.object({
  apifyApiToken: z.string().optional(),
});

// Reuses the canonical source list rather than repeating it — a second copy here
// silently rejected every source added to the registry.
export const updateJobSourcesSchema = z.object({
  jobSources: z.array(jobSourceNameSchema).min(1, "Pick at least one source"),
});

export const updateScrapingProxySchema = z.object({
  // Blank clears the proxy config.
  scrapingProxyProvider: z.string().max(40).nullable().optional(),
  scrapingProxyApiKey: z.string().max(200).nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateScrapingProxyInput = z.infer<typeof updateScrapingProxySchema>;
export type UpdateIntegrationsInput = z.infer<typeof updateIntegrationsSchema>;
export type UpdateJobSourcesInput = z.infer<typeof updateJobSourcesSchema>;
