import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type AggregatorSource, type ScrapedJob } from "../job-source.types";
import { normalizeWorkType } from "../normalize-work-type";
import { stripHtml } from "@/utils/strip-html";
import { matchesQuery } from "./match-query";

const JOBICY_API_URL = "https://jobicy.com/api/v2/remote-jobs";
const RESULT_COUNT = 50;

const jobicyJobSchema = z.object({
  id: z.union([z.string(), z.number()]),
  url: z.string(),
  jobTitle: z.string(),
  companyName: z.string(),
  companyLogo: z.string().nullable().optional(),
  jobIndustry: z.array(z.string()).nullable().optional(),
  jobType: z.array(z.string()).nullable().optional(),
  jobGeo: z.string().nullable().optional(),
  jobLevel: z.string().nullable().optional(),
  jobExcerpt: z.string().nullable().optional(),
  jobDescription: z.string().nullable().optional(),
  annualSalaryMin: z.union([z.string(), z.number()]).nullable().optional(),
  annualSalaryMax: z.union([z.string(), z.number()]).nullable().optional(),
  pubDate: z.string().nullable().optional(),
});

const jobicyResponseSchema = z.object({ jobs: z.array(z.unknown()).nullable().optional() });

export const jobicySource: AggregatorSource = {
  name: "jobicy",
  fetchJobs: async (query, signal) => {
    const payload = await atsRateLimiter.schedule(() =>
      fetchJson(`${JOBICY_API_URL}?count=${RESULT_COUNT}`, { signal }),
    );

    const parsed = jobicyResponseSchema.safeParse(payload);
    if (!parsed.success || !parsed.data.jobs) return [];

    return parseArrayLeniently(parsed.data.jobs, jobicyJobSchema)
      .map((job) =>
        parseScrapedJob({
          sourceJobId: String(job.id),
          source: "jobicy",
          title: job.jobTitle,
          company: job.companyName,
          jobUrl: job.url,
          companyUrl: null,
          location: job.jobGeo ?? null,
          salary: formatSalary(job.annualSalaryMin, job.annualSalaryMax),
          description: job.jobDescription
            ? stripHtml(job.jobDescription)
            : job.jobExcerpt
              ? stripHtml(job.jobExcerpt)
              : null,
          postedAt: job.pubDate ?? null,
          workType: normalizeWorkType(...(job.jobType ?? [])),
          // Jobicy only lists remote roles.
          isRemote: true,
          tags: job.jobIndustry ?? null,
        }),
      )
      .filter((job): job is ScrapedJob => job !== null)
      .filter((job) => matchesQuery(job, query));
  },
};

function formatSalary(
  min?: string | number | null,
  max?: string | number | null,
): string | null {
  const minValue = Number(min);
  const maxValue = Number(max);
  const hasMin = Number.isFinite(minValue) && minValue > 0;
  const hasMax = Number.isFinite(maxValue) && maxValue > 0;

  if (!hasMin && !hasMax) return null;
  if (hasMin && hasMax) return `$${minValue.toLocaleString()} – $${maxValue.toLocaleString()}`;
  return `$${(hasMin ? minValue : maxValue).toLocaleString()}`;
}
