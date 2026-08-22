import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseArrayLeniently, parseScrapedJob, type JobSearchQuery, type ScrapedJob } from "../job-source.types";
import { detectIsRemote, normalizeWorkType } from "../normalize-work-type";
import { parseRelativeDate } from "../parse-relative-date";
import { matchesQuery } from "./match-query";

const SERPAPI_SEARCH_URL = "https://serpapi.com/search.json";

// Every request is a metered search — the free tier is 100 a month. One page per
// title keeps a run's cost equal to the number of keywords, which is the only
// figure a user can reason about. Raise this and a five-keyword run quietly
// doubles in price.
const PAGES_PER_TITLE = 1;

// Google Jobs is the aggregator that actually covers Egypt: it indexes Wuzzuf,
// Bayt, LinkedIn and Indeed Egypt, none of which expose a usable public API.
// `location` is geocoded by Google, so plain city names work.
const serpApiJobSchema = z.object({
  title: z.string(),
  company_name: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  job_id: z.string().nullable().optional(),
  share_link: z.string().nullable().optional(),
  via: z.string().nullable().optional(),
  detected_extensions: z
    .object({
      posted_at: z.string().nullable().optional(),
      schedule_type: z.string().nullable().optional(),
      salary: z.string().nullable().optional(),
      work_from_home: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
  apply_options: z
    .array(z.object({ title: z.string().nullable().optional(), link: z.string().nullable().optional() }))
    .nullable()
    .optional(),
});

// SerpAPI answers 200 with an `error` string for a bad key or an exhausted plan,
// so the HTTP status alone never tells us the search failed.
const serpApiResponseSchema = z.object({
  jobs_results: z.array(z.unknown()).nullable().optional(),
  error: z.string().nullable().optional(),
});

export interface SerpApiCredentials {
  apiKey: string;
}

export interface SearchScope {
  location?: string;
  remote?: boolean;
}

/**
 * The searches one bucket implies.
 *
 * "Remote" and "Cairo" are two different questions for Google Jobs, not one:
 * a location search returns jobs *in* that place, and work-from-home is a
 * separate filter (`ltype=1`) that a location search never surfaces. A bucket
 * listing both wants both, so it costs two searches per keyword — which is the
 * honest price of the answer, and why it's computed once and named here.
 */
export function planSearchScopes(locations: string[]): SearchScope[] {
  const namedPlace = locations.find((candidate) => !isRemoteKeyword(candidate));
  const wantsRemote = locations.some(isRemoteKeyword);

  const scopes: SearchScope[] = [];
  if (namedPlace) scopes.push({ location: namedPlace });
  if (wantsRemote) scopes.push({ remote: true });

  // No location at all — one unscoped search rather than none.
  return scopes.length > 0 ? scopes : [{}];
}

export async function fetchSerpApiJobs(
  credentials: SerpApiCredentials,
  query: JobSearchQuery,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const scopes = planSearchScopes(query.locations);
  const collected: ScrapedJob[] = [];
  const titleErrors: unknown[] = [];

  // One search per keyword per scope — Google Jobs takes a single query string,
  // not a keyword list.
  for (const title of query.titles) {
    for (const scope of scopes) {
      if (signal?.aborted) return collected;

      try {
        collected.push(...(await searchOneScope(credentials, title, scope, query, signal)));
      } catch (error) {
        // Same reasoning as Adzuna: one keyword failing shouldn't discard the
        // results — and the spent searches — of the keywords that worked.
        titleErrors.push(error);
      }
    }
  }

  if (collected.length === 0 && titleErrors.length > 0) throw titleErrors[0];

  return collected;
}

async function searchOneScope(
  credentials: SerpApiCredentials,
  title: string,
  scope: SearchScope,
  query: JobSearchQuery,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const found: ScrapedJob[] = [];
  let nextPageToken: string | null = null;

  for (let page = 0; page < PAGES_PER_TITLE; page++) {
    const params = new URLSearchParams({
      engine: "google_jobs",
      q: title,
      api_key: credentials.apiKey,
      hl: "en",
    });

    if (scope.location) params.set("location", scope.location);
    // Google Jobs' work-from-home filter. Without it a remote-only bucket gets
    // whatever is near the searcher's IP instead.
    if (scope.remote) params.set("ltype", "1");
    if (nextPageToken) params.set("next_page_token", nextPageToken);

    const payload = await atsRateLimiter.schedule(() =>
      fetchJson(`${SERPAPI_SEARCH_URL}?${params.toString()}`, { signal, identifyAsApp: true }),
    );

    const parsed = serpApiResponseSchema.safeParse(payload);
    if (!parsed.success) break;

    // "Google hasn't returned any results for this query" is SerpAPI's way of
    // saying zero hits. It's an empty page, not a broken key.
    if (parsed.data.error) {
      if (/hasn't returned any results/i.test(parsed.data.error)) break;
      throw new Error(`SerpAPI: ${parsed.data.error}`);
    }

    for (const job of parseArrayLeniently(parsed.data.jobs_results ?? [], serpApiJobSchema)) {
      const scraped = toScrapedJob(job);
      // Titles are dropped from the check: Google already matched on the keyword,
      // and its synonym expansion is better than ours. Location still applies —
      // it's what keeps the bucket in charge of where results come from.
      if (scraped && matchesQuery(scraped, { ...query, titles: [] })) found.push(scraped);
    }

    nextPageToken = readNextPageToken(payload);
    if (!nextPageToken) break;
  }

  return found;
}

function toScrapedJob(job: z.infer<typeof serpApiJobSchema>): ScrapedJob | null {
  const applyLink = job.apply_options?.find((option) => option.link)?.link ?? null;
  const jobUrl = job.share_link || applyLink;
  // No link means the listing can't be applied to or deduped reliably — Google
  // occasionally returns one. Nothing downstream can use it.
  if (!jobUrl) return null;

  const extensions = job.detected_extensions ?? null;

  return parseScrapedJob({
    // job_id is Google's own stable token; the URL is the fallback when it's absent.
    sourceJobId: job.job_id || jobUrl,
    source: "serpapi",
    title: job.title,
    company: job.company_name || "Unknown",
    jobUrl,
    companyUrl: null,
    location: job.location ?? null,
    salary: extensions?.salary ?? null,
    description: job.description ?? null,
    postedAt: parseRelativeDate(extensions?.posted_at),
    workType: normalizeWorkType(extensions?.schedule_type),
    isRemote: extensions?.work_from_home ?? detectIsRemote(job.location, job.title),
    // `via` records which board Google found it on ("via Wuzzuf"), which is worth
    // keeping — it's how a Cairo user sees the Egyptian boards are being reached.
    tags: job.via ? [job.via.replace(/^via\s+/i, "")] : null,
  });
}

// The token lives under serpapi_pagination, which the response schema leaves
// as unknown — reading it here keeps that schema to the fields we validate.
function readNextPageToken(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const pagination = (payload as { serpapi_pagination?: { next_page_token?: unknown } })
    .serpapi_pagination;
  return typeof pagination?.next_page_token === "string" ? pagination.next_page_token : null;
}

function isRemoteKeyword(location: string): boolean {
  return /remote|anywhere|worldwide/i.test(location);
}
