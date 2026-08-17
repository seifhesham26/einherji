import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type AggregatorSource, type ScrapedJob } from "../job-source.types";
import { detectIsRemote, normalizeWorkType } from "../normalize-work-type";
import { stripHtml } from "@/utils/strip-html";
import { matchesQuery } from "./match-query";

const THEMUSE_API_URL = "https://www.themuse.com/api/public/jobs";
const MAX_PAGES = 3;

const museJobSchema = z.object({
  id: z.number(),
  name: z.string(),
  contents: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  publication_date: z.string().nullable().optional(),
  company: z.object({ name: z.string(), short_name: z.string().nullable().optional() }),
  locations: z.array(z.object({ name: z.string() })).nullable().optional(),
  levels: z.array(z.object({ name: z.string() })).nullable().optional(),
  categories: z.array(z.object({ name: z.string() })).nullable().optional(),
  refs: z.object({ landing_page: z.string() }).nullable().optional(),
});

const museResponseSchema = z.object({ results: z.array(z.unknown()) });

export const theMuseSource: AggregatorSource = {
  name: "themuse",
  fetchJobs: async (query, signal) => {
    const collected: ScrapedJob[] = [];
    // Same overlap risk as any paginated feed — see arbeitnow.ts.
    const seenIds = new Set<number>();

    for (let page = 1; page <= MAX_PAGES; page++) {
      if (signal?.aborted) break;

      const payload = await atsRateLimiter.schedule(() =>
        fetchJson(`${THEMUSE_API_URL}?page=${page}`, { signal }),
      );

      const parsed = museResponseSchema.safeParse(payload);
      if (!parsed.success || parsed.data.results.length === 0) break;

      for (const job of parseArrayLeniently(parsed.data.results, museJobSchema)) {
        if (seenIds.has(job.id)) continue;
        seenIds.add(job.id);

        // The public listing URL lives on refs; there's no other way to build it.
        const jobUrl = job.refs?.landing_page;
        if (!jobUrl) continue;

        const locations = (job.locations ?? []).map((location) => location.name);

        const scraped = parseScrapedJob({
          sourceJobId: String(job.id),
          source: "themuse",
          title: job.name,
          company: job.company.name,
          jobUrl,
          companyUrl: null,
          location: locations.join(" · ") || null,
          salary: null,
          description: job.contents ? stripHtml(job.contents) : null,
          postedAt: job.publication_date ?? null,
          workType: normalizeWorkType(job.type),
          isRemote: detectIsRemote(...locations),
          tags: [
            ...(job.categories ?? []).map((category) => category.name),
            ...(job.levels ?? []).map((level) => level.name),
          ],
        });

        if (scraped && matchesQuery(scraped, query)) collected.push(scraped);
      }
    }

    return collected;
  },
};
