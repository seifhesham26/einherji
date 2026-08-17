import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type ScrapedJob } from "../job-source.types";
import { detectIsRemote } from "../normalize-work-type";

const RIPPLING_BOARD_URL = "https://api.rippling.com/platform/api/ats/v1/board";

const ripplingJobSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  url: z.string(),
  department: z.object({ label: z.string().nullable().optional() }).nullable().optional(),
  workLocation: z.object({ label: z.string().nullable().optional() }).nullable().optional(),
});

export async function fetchRipplingJobs(
  boardSlug: string,
  companyName: string,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const payload = await atsRateLimiter.schedule(() =>
    fetchJson(`${RIPPLING_BOARD_URL}/${encodeURIComponent(boardSlug)}/jobs`, { signal }),
  );

  return parseArrayLeniently(payload, ripplingJobSchema)
    .map((job) => {
      const location = job.workLocation?.label ?? null;

      return parseScrapedJob({
        sourceJobId: job.uuid,
        source: "rippling",
        title: job.name,
        company: companyName,
        jobUrl: job.url,
        companyUrl: null,
        location,
        salary: null,
        // The board endpoint returns listings only — no description field.
        description: null,
        postedAt: null,
        workType: "unknown",
        isRemote: detectIsRemote(location),
        tags: job.department?.label ? [job.department.label] : null,
      });
    })
    .filter((job): job is ScrapedJob => job !== null);
}
