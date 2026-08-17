import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type ScrapedJob } from "../job-source.types";

const ASHBY_JOB_BOARD_URL = "https://api.ashbyhq.com/posting-api/job-board";

const ashbyJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  jobUrl: z.string(),
  location: z.string().nullable().optional(),
  secondaryLocations: z
    .array(z.object({ location: z.string().nullable().optional() }))
    .nullable()
    .optional(),
  publishedAt: z.string().nullable().optional(),
  // Unlisted postings are drafts or internal-only — they shouldn't reach the user.
  isListed: z.boolean().nullable().optional(),
  isRemote: z.boolean().nullable().optional(),
  workplaceType: z.string().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  descriptionPlain: z.string().nullable().optional(),
});

const ashbyResponseSchema = z.object({ jobs: z.array(z.unknown()) });

export async function fetchAshbyJobs(
  boardSlug: string,
  companyName: string,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const payload = await atsRateLimiter.schedule(() =>
    fetchJson(`${ASHBY_JOB_BOARD_URL}/${encodeURIComponent(boardSlug)}`, { signal }),
  );

  const parsed = ashbyResponseSchema.safeParse(payload);
  if (!parsed.success) return [];

  return parseArrayLeniently(parsed.data.jobs, ashbyJobSchema)
    .filter((job) => job.isListed !== false)
    .map((job) =>
      parseScrapedJob({
        sourceJobId: job.id,
        source: "ashby",
        // Ashby titles occasionally carry leading whitespace from the board editor.
        title: job.title.trim(),
        company: companyName,
        jobUrl: job.jobUrl,
        companyUrl: null,
        location: buildLocation(job),
        salary: null,
        description: job.descriptionPlain ?? null,
        postedAt: job.publishedAt ?? null,
      }),
    )
    .filter((job): job is ScrapedJob => job !== null);
}

// Ashby splits locations across a primary and a secondary list; a role open in
// four cities should read that way rather than showing only the HQ.
function buildLocation(job: z.infer<typeof ashbyJobSchema>): string | null {
  const locations = [
    job.location,
    ...(job.secondaryLocations ?? []).map((secondary) => secondary.location),
  ].filter((location): location is string => Boolean(location?.trim()));

  const unique = [...new Set(locations)];
  return unique.length > 0 ? unique.join(" · ") : null;
}
