import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type ScrapedJob } from "../job-source.types";
import { stripHtml } from "@/utils/strip-html";

const WORKABLE_WIDGET_URL = "https://apply.workable.com/api/v1/widget/accounts";

const workableJobSchema = z.object({
  shortcode: z.string(),
  title: z.string(),
  url: z.string(),
  application_url: z.string().nullable().optional(),
  published_on: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  telecommuting: z.boolean().nullable().optional(),
  description: z.string().nullable().optional(),
  requirements: z.string().nullable().optional(),
});

const workableResponseSchema = z.object({
  name: z.string().nullable().optional(),
  jobs: z.array(z.unknown()).nullable().optional(),
});

export async function fetchWorkableJobs(
  accountSlug: string,
  companyName: string,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const payload = await atsRateLimiter.schedule(() =>
    fetchJson(
      `${WORKABLE_WIDGET_URL}/${encodeURIComponent(accountSlug)}?details=true`,
      { signal },
    ),
  );

  const parsed = workableResponseSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.jobs) return [];

  return parseArrayLeniently(parsed.data.jobs, workableJobSchema)
    .map((job) =>
      parseScrapedJob({
        sourceJobId: job.shortcode,
        source: "workable",
        title: job.title,
        company: parsed.data.name || companyName,
        jobUrl: job.url,
        companyUrl: null,
        location: buildLocation(job),
        salary: null,
        description: joinDescription(job.description, job.requirements),
        postedAt: job.published_on ?? null,
      }),
    )
    .filter((job): job is ScrapedJob => job !== null);
}

function buildLocation(job: z.infer<typeof workableJobSchema>): string | null {
  if (job.telecommuting) return "Remote";
  const parts = [job.city, job.state, job.country].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

function joinDescription(description?: string | null, requirements?: string | null): string | null {
  const sections = [description, requirements]
    .filter((section): section is string => Boolean(section?.trim()))
    .map(stripHtml);
  return sections.length > 0 ? sections.join("\n\n") : null;
}
