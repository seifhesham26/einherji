import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type ScrapedJob } from "../job-source.types";
import { stripHtml } from "@/utils/strip-html";

const GREENHOUSE_BOARD_URL = "https://boards-api.greenhouse.io/v1/boards";

const greenhouseJobSchema = z.object({
  id: z.number(),
  title: z.string(),
  absolute_url: z.string(),
  location: z.object({ name: z.string() }).nullable().optional(),
  updated_at: z.string().nullable().optional(),
  first_published: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  // Only present with ?content=true, and arrives HTML-entity encoded.
  content: z.string().nullable().optional(),
});

const greenhouseResponseSchema = z.object({ jobs: z.array(z.unknown()) });

export async function fetchGreenhouseJobs(
  boardSlug: string,
  companyName: string,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const payload = await atsRateLimiter.schedule(() =>
    fetchJson(`${GREENHOUSE_BOARD_URL}/${encodeURIComponent(boardSlug)}/jobs?content=true`, {
      signal,
    }),
  );

  const parsed = greenhouseResponseSchema.safeParse(payload);
  if (!parsed.success) return [];

  return parseArrayLeniently(parsed.data.jobs, greenhouseJobSchema)
    .map((job) =>
      parseScrapedJob({
        sourceJobId: String(job.id),
        source: "greenhouse",
        title: job.title,
        // Greenhouse echoes the board's own company name; prefer it when present.
        company: job.company_name || companyName,
        jobUrl: job.absolute_url,
        companyUrl: null,
        location: job.location?.name ?? null,
        salary: null,
        description: job.content ? stripHtml(job.content) : null,
        // first_published is when the role opened; updated_at moves on every edit.
        postedAt: job.first_published ?? job.updated_at ?? null,
      }),
    )
    .filter((job): job is ScrapedJob => job !== null);
}
