import { z } from "zod";

// ─── The contract every job source must satisfy ───────────────────────────────
// This schema is also the runtime validation boundary: scraped data is untrusted
// and must be parsed here rather than cast, so a malformed record is dropped
// instead of becoming a NOT NULL violation three layers down in the insert.

export const jobSourceNameSchema = z.enum([
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "rippling",
  "remoteok",
  "arbeitnow",
  "jobicy",
  "themuse",
  "himalayas",
  "weworkremotely",
  "hackernews",
  "wuzzuf",
  "freelancer",
  "hackernews_freelance",
  "adzuna",
  "reddit",
  "twitter",
  "serpapi",
  "google_places",
  "linkedin_guest",
  "apify",
]);

export type JobSourceName = z.infer<typeof jobSourceNameSchema>;

export const workTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "freelance",
  "internship",
  "unknown",
]);

export type WorkType = z.infer<typeof workTypeSchema>;

// Boards routinely ship unfilled template values through as if they were real
// data — Stripe's Greenhouse board returns the literal string "LOCATION". Left
// alone these reach the UI and the LLM prompt as though they meant something.
const PLACEHOLDER_VALUES = new Set([
  "n/a",
  "na",
  "none",
  "null",
  "tbd",
  "location",
  "unknown",
  "-",
  "--",
]);

const cleanedString = z
  .string()
  .nullable()
  .default(null)
  .transform((value) => {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return PLACEHOLDER_VALUES.has(trimmed.toLowerCase()) ? null : trimmed;
  });

export const scrapedJobSchema = z.object({
  sourceJobId: z.string().min(1),
  source: jobSourceNameSchema,
  title: z.string().min(1),
  company: z.string().min(1),
  jobUrl: z.string().url(),
  companyUrl: z.string().url().nullable().default(null),
  location: cleanedString,
  salary: cleanedString,
  description: cleanedString,
  postedAt: z.coerce.date().nullable().default(null),
  workType: workTypeSchema.default("unknown"),
  isRemote: z.boolean().nullable().default(null),
  tags: z.array(z.string()).nullable().default(null),
  // Some sources require visible credit as a condition of API access.
  attributionText: z.string().nullable().default(null),
  attributionUrl: z.string().url().nullable().default(null),
});

export type ScrapedJob = z.infer<typeof scrapedJobSchema>;

// The card-level shape, before the detail pass fills in the description.
export const scrapedJobSummarySchema = scrapedJobSchema.omit({ description: true });

export type ScrapedJobSummary = z.infer<typeof scrapedJobSummarySchema>;

export interface JobSearchQuery {
  titles: string[];
  locations: string[];
  daysPosted?: number;
  salaryMin?: number;
  // Narrows a run to particular engagement types — a freelancer wants gigs, not
  // permanent roles. Empty means "any".
  workTypes?: WorkType[];
}

export interface JobSourceContext {
  // Job ids already stored for this user, so a source can skip the expensive
  // detail fetch for anything we've seen before.
  existingSourceJobIds: Set<string>;
  signal: AbortSignal;
}

export interface JobSource {
  readonly name: JobSourceName;
  // An async generator rather than a Promise<ScrapedJob[]>: scraping is slow and
  // paginated, so streaming lets the caller persist early results. A run that
  // dies halfway still leaves real jobs behind instead of nothing.
  search(query: JobSearchQuery, context: JobSourceContext): AsyncGenerator<ScrapedJob>;
}

// Aggregators return a whole feed in one request, so they don't need the
// streaming contract — a plain promise keeps them far simpler to write.
export interface AggregatorSource {
  readonly name: JobSourceName;
  fetchJobs(query: JobSearchQuery, signal?: AbortSignal): Promise<ScrapedJob[]>;
}

// Parses a candidate record, returning null instead of throwing. Sources use this
// so one bad record can't abort an otherwise good run.
export function parseScrapedJob(candidate: unknown): ScrapedJob | null {
  const result = scrapedJobSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

/**
 * Removes repeated jobs, keeping the first occurrence.
 *
 * Paginated feeds overlap — Arbeitnow returns the same slug on more than one page
 * when new jobs shift the window mid-scrape. Duplicates in a single insert batch
 * make the run's counts wrong, so they're dropped before they reach the database.
 */
export function dedupeBySourceJobId(jobs: ScrapedJob[]): ScrapedJob[] {
  const seen = new Set<string>();
  const unique: ScrapedJob[] = [];

  for (const job of jobs) {
    const key = `${job.source}:${job.sourceJobId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(job);
  }

  return unique;
}

/**
 * Validates a list of records one at a time, dropping the ones that fail.
 *
 * Validating the array as a whole (`z.array(schema).safeParse`) is all-or-nothing:
 * Arbeitnow ships roughly one malformed record per 175, and that single record
 * would discard the entire page. Feeds are third-party data and always contain
 * some junk, so partial success is the only sane behaviour here.
 */
export function parseArrayLeniently<T>(
  items: unknown,
  schema: z.ZodType<T>,
): T[] {
  if (!Array.isArray(items)) return [];

  const parsed: T[] = [];
  for (const item of items) {
    const result = schema.safeParse(item);
    if (result.success) parsed.push(result.data);
  }
  return parsed;
}
