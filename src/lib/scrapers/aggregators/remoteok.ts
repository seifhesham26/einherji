import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseScrapedJob, type AggregatorSource, type ScrapedJob } from "../job-source.types";
import { detectIsRemote, normalizeWorkType } from "../normalize-work-type";
import { stripHtml } from "@/utils/strip-html";
import { matchesQuery } from "./match-query";

const REMOTEOK_API_URL = "https://remoteok.com/api";

// RemoteOK's terms make a followed link back a condition of API access, so every
// job carries the attribution through to the UI.
const ATTRIBUTION = { text: "Jobs by RemoteOK", url: "https://remoteok.com" };

const remoteOkJobSchema = z.object({
  id: z.union([z.string(), z.number()]),
  slug: z.string().optional(),
  position: z.string(),
  company: z.string(),
  url: z.string(),
  date: z.string().optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
});

export const remoteOkSource: AggregatorSource = {
  name: "remoteok",
  fetchJobs: async (query, signal) => {
    const payload = await atsRateLimiter.schedule(() => fetchJson(REMOTEOK_API_URL, { signal }));

    const entries = z.array(z.unknown()).safeParse(payload);
    if (!entries.success) return [];

    const jobs = entries.data
      // The first element is a legal/ToS notice object, not a job.
      .map((entry) => remoteOkJobSchema.safeParse(entry))
      .filter((result) => result.success)
      .map((result) => toScrapedJob(result.data))
      .filter((job): job is ScrapedJob => job !== null);

    return jobs.filter((job) => matchesQuery(job, query));
  },
};

function toScrapedJob(job: z.infer<typeof remoteOkJobSchema>): ScrapedJob | null {
  return parseScrapedJob({
    sourceJobId: String(job.id),
    source: "remoteok",
    title: job.position,
    company: job.company,
    jobUrl: job.url,
    companyUrl: null,
    location: job.location ?? null,
    salary: formatSalary(job.salary_min, job.salary_max),
    description: job.description ? stripHtml(job.description) : null,
    postedAt: job.date ?? null,
    workType: normalizeWorkType(...(job.tags ?? [])),
    // Everything on RemoteOK is remote by definition.
    isRemote: detectIsRemote(job.location) ?? true,
    tags: job.tags ?? null,
    attributionText: ATTRIBUTION.text,
    attributionUrl: ATTRIBUTION.url,
  });
}

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`;
  return `$${(min ?? max)!.toLocaleString()}`;
}
