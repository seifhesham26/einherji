import { z } from "zod";
import { HTTP_URL_MESSAGE, isHttpUrl } from "@/utils/is-http-url";

// Kept in sync with ATS_FETCHERS in lib/scrapers/ats/fetch-ats-jobs.ts — adding a
// provider there without adding it here means it can never be saved.
export const atsProviderValues = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "rippling",
] as const;

export const atsProviderSchema = z.enum(atsProviderValues);

// The careers URL is fetched server-side, so the scheme is narrowed here and the
// address itself is checked at fetch time by assert-safe-url.ts.
const httpUrlSchema = z.string().url("Must be a valid URL").refine(isHttpUrl, HTTP_URL_MESSAGE);

export const addCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(120),
  careersUrl: httpUrlSchema.optional().or(z.literal("")),
});

export const updateCompanySchema = z.object({
  id: z.string().min(1),
  // Lets the user correct a bad auto-detection by hand.
  atsProvider: atsProviderSchema.nullable().optional(),
  atsSlug: z.string().min(1).nullable().optional(),
});

export const deleteCompanySchema = z.object({
  id: z.string().min(1),
});

export const resolveCompanySchema = z.object({
  id: z.string().min(1),
});

export type AtsProvider = z.infer<typeof atsProviderSchema>;
export type AddCompanyInput = z.infer<typeof addCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type DeleteCompanyInput = z.infer<typeof deleteCompanySchema>;
export type ResolveCompanyInput = z.infer<typeof resolveCompanySchema>;
