import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type AggregatorSource, type ScrapedJob } from "../job-source.types";
import { normalizeWorkType } from "../normalize-work-type";
import { stripHtml } from "@/utils/strip-html";
import { matchesQuery } from "./match-query";

const ARBEITNOW_API_URL = "https://www.arbeitnow.com/api/job-board-api";
// The feed is paginated; a handful of pages is plenty and keeps the run short.
const MAX_PAGES = 3;

const arbeitnowJobSchema = z.object({
  slug: z.string(),
  title: z.string(),
  company_name: z.string(),
  url: z.string(),
  description: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  remote: z.boolean().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  job_types: z.array(z.string()).nullable().optional(),
  created_at: z.number().nullable().optional(),
});

// Envelope only — the records inside are validated one at a time so a single
// malformed entry can't discard the whole page.
const arbeitnowResponseSchema = z.object({ data: z.array(z.unknown()) });

export const arbeitnowSource: AggregatorSource = {
  name: "arbeitnow",
  fetchJobs: async (query, signal) => {
    const collected: ScrapedJob[] = [];
    // Pages overlap: new postings shift the window while we're walking it, so the
    // same slug can appear on page 1 and again on page 2.
    const seenSlugs = new Set<string>();

    for (let page = 1; page <= MAX_PAGES; page++) {
      if (signal?.aborted) break;

      const payload = await atsRateLimiter.schedule(() =>
        fetchJson(`${ARBEITNOW_API_URL}?page=${page}`, { signal }),
      );

      const parsed = arbeitnowResponseSchema.safeParse(payload);
      if (!parsed.success || parsed.data.data.length === 0) break;

      for (const job of parseArrayLeniently(parsed.data.data, arbeitnowJobSchema)) {
        if (seenSlugs.has(job.slug)) continue;
        seenSlugs.add(job.slug);

        const scraped = parseScrapedJob({
          sourceJobId: job.slug,
          source: "arbeitnow",
          title: job.title,
          company: job.company_name,
          jobUrl: job.url,
          companyUrl: null,
          location: job.location ?? null,
          salary: null,
          description: job.description ? stripHtml(job.description) : null,
          // Arbeitnow gives created_at in seconds, not milliseconds.
          postedAt: job.created_at ? new Date(job.created_at * 1000) : null,
          workType: normalizeWorkType(...(job.job_types ?? [])),
          isRemote: job.remote ?? null,
          tags: job.tags ?? null,
        });

        if (scraped && matchesQuery(scraped, query)) collected.push(scraped);
      }
    }

    return collected;
  },
};
