import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type AggregatorSource, type ScrapedJob } from "../job-source.types";
import { normalizeWorkType } from "../normalize-work-type";
import { stripHtml } from "@/utils/strip-html";
import { matchesQuery } from "./match-query";

const HIMALAYAS_API_URL = "https://himalayas.app/jobs/api";
// Their effective cap: anything above ~20 returns the same payload, and asking
// for more makes them rate-limit sooner.
const RESULT_LIMIT = 20;

const himalayasJobSchema = z.object({
  guid: z.union([z.string(), z.number()]),
  title: z.string(),
  companyName: z.string(),
  companySlug: z.string().nullable().optional(),
  applicationLink: z.string(),
  excerpt: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  employmentType: z.string().nullable().optional(),
  seniority: z.union([z.string(), z.array(z.string())]).nullable().optional(),
  minSalary: z.number().nullable().optional(),
  maxSalary: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  locationRestrictions: z.array(z.string()).nullable().optional(),
  categories: z.array(z.string()).nullable().optional(),
  pubDate: z.union([z.string(), z.number()]).nullable().optional(),
});

const himalayasResponseSchema = z.object({ jobs: z.array(z.unknown()).nullable().optional() });

export const himalayasSource: AggregatorSource = {
  name: "himalayas",
  fetchJobs: async (query, signal) => {
    const payload = await atsRateLimiter.schedule(() =>
      fetchJson(`${HIMALAYAS_API_URL}?limit=${RESULT_LIMIT}`, { signal }),
    );

    const parsed = himalayasResponseSchema.safeParse(payload);
    if (!parsed.success || !parsed.data.jobs) return [];

    return parseArrayLeniently(parsed.data.jobs, himalayasJobSchema)
      .map((job) => {
        const restrictions = job.locationRestrictions ?? [];

        return parseScrapedJob({
          sourceJobId: String(job.guid),
          source: "himalayas",
          title: job.title,
          company: job.companyName,
          jobUrl: job.applicationLink,
          companyUrl: null,
          // Himalayas is remote-only; the restrictions are which regions qualify.
          location: restrictions.join(" · ") || "Remote",
          salary: formatSalary(job.minSalary, job.maxSalary, job.currency),
          description: job.description
            ? stripHtml(job.description)
            : job.excerpt
              ? stripHtml(job.excerpt)
              : null,
          postedAt: normalizePubDate(job.pubDate),
          workType: normalizeWorkType(job.employmentType),
          isRemote: true,
          tags: job.categories ?? null,
        });
      })
      .filter((job): job is ScrapedJob => job !== null)
      .filter((job) => matchesQuery(job, query));
  },
};

// pubDate arrives as either an ISO string or epoch seconds depending on the job.
function normalizePubDate(pubDate?: string | number | null): Date | string | null {
  if (pubDate === null || pubDate === undefined) return null;
  if (typeof pubDate === "number") return new Date(pubDate * 1000);
  return pubDate;
}

function formatSalary(
  min?: number | null,
  max?: number | null,
  currency?: string | null,
): string | null {
  if (!min && !max) return null;
  const symbol = currency === "USD" || !currency ? "$" : `${currency} `;
  if (min && max) return `${symbol}${min.toLocaleString()} – ${symbol}${max.toLocaleString()}`;
  return `${symbol}${(min ?? max)!.toLocaleString()}`;
}
