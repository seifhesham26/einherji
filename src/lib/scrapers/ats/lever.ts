import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type ScrapedJob } from "../job-source.types";

const LEVER_POSTINGS_URL = "https://api.lever.co/v0/postings";

const leverJobSchema = z.object({
  id: z.string(),
  // Lever calls the job title "text".
  text: z.string(),
  hostedUrl: z.string(),
  applyUrl: z.string().nullable().optional(),
  // Epoch milliseconds, not an ISO string.
  createdAt: z.number().nullable().optional(),
  categories: z
    .object({
      location: z.string().nullable().optional(),
      commitment: z.string().nullable().optional(),
      department: z.string().nullable().optional(),
      team: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  // Lever ships pre-rendered plain text, so no HTML stripping needed.
  descriptionPlain: z.string().nullable().optional(),
  additionalPlain: z.string().nullable().optional(),
});

export async function fetchLeverJobs(
  companySlug: string,
  companyName: string,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const payload = await atsRateLimiter.schedule(() =>
    fetchJson(`${LEVER_POSTINGS_URL}/${encodeURIComponent(companySlug)}?mode=json`, { signal }),
  );

  return parseArrayLeniently(payload, leverJobSchema)
    .map((job) =>
      parseScrapedJob({
        sourceJobId: job.id,
        source: "lever",
        title: job.text,
        company: companyName,
        jobUrl: job.hostedUrl,
        companyUrl: null,
        location: job.categories?.location ?? null,
        salary: null,
        description: joinDescription(job.descriptionPlain, job.additionalPlain),
        postedAt: job.createdAt ? new Date(job.createdAt) : null,
      }),
    )
    .filter((job): job is ScrapedJob => job !== null);
}

// The body and the "additional" block are separate fields but read as one document.
function joinDescription(body?: string | null, additional?: string | null): string | null {
  const sections = [body, additional].filter((section): section is string => Boolean(section?.trim()));
  return sections.length > 0 ? sections.join("\n\n") : null;
}
