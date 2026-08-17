import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type JobSearchQuery, type ScrapedJob } from "../job-source.types";
import { detectIsRemote, normalizeWorkType } from "../normalize-work-type";
import { matchesQuery } from "./match-query";

const ADZUNA_API_URL = "https://api.adzuna.com/v1/api/jobs";
const RESULTS_PER_PAGE = 50;
const DEFAULT_COUNTRY = "gb";

// Adzuna is country-scoped, and the code is part of the path rather than a
// parameter. Mapping the user's stated locations onto it beats hardcoding.
const COUNTRY_KEYWORDS: { code: string; keywords: string[] }[] = [
  { code: "us", keywords: ["united states", "usa", "us", "america", "new york", "san francisco", "remote"] },
  { code: "gb", keywords: ["united kingdom", "uk", "england", "london", "scotland"] },
  { code: "de", keywords: ["germany", "berlin", "munich", "deutschland"] },
  { code: "ca", keywords: ["canada", "toronto", "vancouver"] },
  { code: "au", keywords: ["australia", "sydney", "melbourne"] },
  { code: "in", keywords: ["india", "bangalore", "mumbai", "delhi"] },
  { code: "nl", keywords: ["netherlands", "amsterdam"] },
  { code: "fr", keywords: ["france", "paris"] },
  { code: "pl", keywords: ["poland", "warsaw"] },
  { code: "za", keywords: ["south africa", "cape town", "johannesburg"] },
];

const adzunaJobSchema = z.object({
  id: z.string(),
  title: z.string(),
  redirect_url: z.string(),
  description: z.string().nullable().optional(),
  created: z.string().nullable().optional(),
  contract_time: z.string().nullable().optional(),
  contract_type: z.string().nullable().optional(),
  salary_min: z.number().nullable().optional(),
  salary_max: z.number().nullable().optional(),
  company: z.object({ display_name: z.string().nullable().optional() }).nullable().optional(),
  location: z.object({ display_name: z.string().nullable().optional() }).nullable().optional(),
  category: z.object({ label: z.string().nullable().optional() }).nullable().optional(),
});

const adzunaResponseSchema = z.object({ results: z.array(z.unknown()) });

export interface AdzunaCredentials {
  appId: string;
  apiKey: string;
}

export async function fetchAdzunaJobs(
  credentials: AdzunaCredentials,
  query: JobSearchQuery,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const country = resolveCountry(query.locations);
  const collected: ScrapedJob[] = [];

  // Adzuna takes one keyword string per request, so each title is its own call.
  for (const title of query.titles) {
    if (signal?.aborted) break;

    const params = new URLSearchParams({
      app_id: credentials.appId,
      app_key: credentials.apiKey,
      results_per_page: String(RESULTS_PER_PAGE),
      what: title,
      "content-type": "application/json",
    });

    const location = query.locations.find((candidate) => !isRemoteKeyword(candidate));
    if (location) params.set("where", location);
    if (query.salaryMin) params.set("salary_min", String(query.salaryMin));

    const payload = await atsRateLimiter.schedule(() =>
      fetchJson(`${ADZUNA_API_URL}/${country}/search/1?${params.toString()}`, { signal }),
    );

    const parsed = adzunaResponseSchema.safeParse(payload);
    if (!parsed.success) continue;

    for (const job of parseArrayLeniently(parsed.data.results, adzunaJobSchema)) {
      const scraped = parseScrapedJob({
        sourceJobId: job.id,
        source: "adzuna",
        title: job.title,
        company: job.company?.display_name || "Unknown",
        jobUrl: job.redirect_url,
        companyUrl: null,
        location: job.location?.display_name ?? null,
        salary: formatSalary(job.salary_min, job.salary_max),
        description: job.description ?? null,
        postedAt: job.created ?? null,
        workType: normalizeWorkType(job.contract_time, job.contract_type),
        isRemote: detectIsRemote(job.location?.display_name, job.title),
        tags: job.category?.label ? [job.category.label] : null,
      });

      // Adzuna already filtered server-side; this only drops work-type mismatches.
      if (scraped && matchesQuery(scraped, { ...query, titles: [], locations: [] })) {
        collected.push(scraped);
      }
    }
  }

  return collected;
}

function resolveCountry(locations: string[]): string {
  for (const location of locations) {
    const normalized = location.toLowerCase();
    for (const { code, keywords } of COUNTRY_KEYWORDS) {
      if (keywords.some((keyword) => normalized.includes(keyword))) return code;
    }
  }
  return DEFAULT_COUNTRY;
}

function isRemoteKeyword(location: string): boolean {
  return /remote|anywhere|worldwide/i.test(location);
}

function formatSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `${Math.round(min).toLocaleString()} – ${Math.round(max).toLocaleString()}`;
  return Math.round((min ?? max)!).toLocaleString();
}
