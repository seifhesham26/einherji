import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type ScrapedJob } from "../job-source.types";
import { normalizeWorkType } from "../normalize-work-type";

const SMARTRECRUITERS_API_URL = "https://api.smartrecruiters.com/v1/companies";
const PAGE_LIMIT = 100;

const smartRecruitersPostingSchema = z.object({
  id: z.string(),
  name: z.string(),
  releasedDate: z.string().nullable().optional(),
  company: z.object({ identifier: z.string().nullable().optional(), name: z.string().nullable().optional() }).nullable().optional(),
  location: z
    .object({
      city: z.string().nullable().optional(),
      region: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      remote: z.boolean().nullable().optional(),
      fullLocation: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  typeOfEmployment: z.object({ label: z.string().nullable().optional() }).nullable().optional(),
  department: z.object({ label: z.string().nullable().optional() }).nullable().optional(),
  function: z.object({ label: z.string().nullable().optional() }).nullable().optional(),
  experienceLevel: z.object({ label: z.string().nullable().optional() }).nullable().optional(),
});

const smartRecruitersResponseSchema = z.object({
  content: z.array(z.unknown()).nullable().optional(),
});

export async function fetchSmartRecruitersJobs(
  companySlug: string,
  companyName: string,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const payload = await atsRateLimiter.schedule(() =>
    fetchJson(
      `${SMARTRECRUITERS_API_URL}/${encodeURIComponent(companySlug)}/postings?limit=${PAGE_LIMIT}`,
      { signal },
    ),
  );

  const parsed = smartRecruitersResponseSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.content) return [];

  return parseArrayLeniently(parsed.data.content, smartRecruitersPostingSchema)
    .map((posting) => {
      const tags = [posting.department?.label, posting.function?.label, posting.experienceLevel?.label]
        .filter((tag): tag is string => Boolean(tag));

      return parseScrapedJob({
        sourceJobId: posting.id,
        source: "smartrecruiters",
        title: posting.name,
        company: posting.company?.name || companyName,
        // The API's own `ref` points back at the API, not a page a human can open.
        jobUrl: `https://jobs.smartrecruiters.com/${companySlug}/${posting.id}`,
        companyUrl: null,
        location: posting.location?.fullLocation ?? buildLocation(posting.location),
        salary: null,
        // The list endpoint omits descriptions; fetching each one would cost a
        // request per job for marginal benefit.
        description: null,
        postedAt: posting.releasedDate ?? null,
        workType: normalizeWorkType(posting.typeOfEmployment?.label),
        isRemote: posting.location?.remote ?? null,
        tags: tags.length > 0 ? tags : null,
      });
    })
    .filter((job): job is ScrapedJob => job !== null);
}

function buildLocation(
  location: z.infer<typeof smartRecruitersPostingSchema>["location"],
): string | null {
  if (!location) return null;
  const parts = [location.city, location.region, location.country].filter(
    (part): part is string => Boolean(part?.trim()),
  );
  return parts.length > 0 ? parts.join(", ") : null;
}
