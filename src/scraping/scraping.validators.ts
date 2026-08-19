import { z } from "zod";
import { jobSourceNameSchema, workTypeSchema } from "@/lib/scrapers/job-source.types";

export const scrapeStatusValues = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export const scrapeStatusSchema = z.enum(scrapeStatusValues);

export const startScrapeSchema = z.object({
  // Run one bucket's search. Its keywords, locations and sources take over from
  // the account-level criteria, and results are filed under it.
  bucketId: z.string().min(1).optional(),
  // Omitted means "use whatever the user configured in Settings".
  sources: z.array(jobSourceNameSchema).min(1).optional(),
  // Narrows a run to particular engagement types — freelancers want gigs, not
  // permanent roles. Omitted means "any".
  workTypes: z.array(workTypeSchema).min(1).optional(),
});

export const getRunStatusSchema = z.object({
  runId: z.string().min(1),
});

export type ScrapeStatus = z.infer<typeof scrapeStatusSchema>;
export type StartScrapeInput = z.infer<typeof startScrapeSchema>;
export type GetRunStatusInput = z.infer<typeof getRunStatusSchema>;

export type { JobSourceName } from "@/lib/scrapers/job-source.types";
