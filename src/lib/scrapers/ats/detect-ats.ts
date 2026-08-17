import { fetchText, fetchWithRetry } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { ScrapeError } from "../http/scrape-error";
import type { AtsProvider } from "./fetch-ats-jobs";

export type { AtsProvider };

export interface DetectedAts {
  provider: AtsProvider;
  slug: string;
}

// Each ATS embeds its board under a predictable host, so the careers page markup
// gives away both the provider and the slug in one request.
const ATS_URL_PATTERNS: { provider: AtsProvider; pattern: RegExp }[] = [
  { provider: "greenhouse", pattern: /(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board\?for=)?([a-z0-9_-]+)/i },
  { provider: "lever", pattern: /jobs\.(?:eu\.)?lever\.co\/([a-z0-9_-]+)/i },
  { provider: "ashby", pattern: /jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i },
  { provider: "smartrecruiters", pattern: /jobs\.smartrecruiters\.com\/([a-zA-Z0-9_-]+)/i },
  { provider: "rippling", pattern: /ats\.rippling\.com\/([a-z0-9_-]+)/i },
  { provider: "workable", pattern: /([a-z0-9_-]+)\.workable\.com/i },
];

// Probing a slug is a bare HEAD-equivalent request; a 404 costs nothing and just
// means "not this one". Ordered by how common each ATS is among tech employers.
// Slugs are derived from a user-supplied company name, so they're encoded rather
// than interpolated raw — otherwise a name containing "/" or "?" rewrites the path.
const PROBE_URL_BUILDERS: { provider: AtsProvider; buildUrl: (slug: string) => string }[] = [
  { provider: "greenhouse", buildUrl: (slug) => `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(slug)}/jobs` },
  { provider: "ashby", buildUrl: (slug) => `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}` },
  { provider: "lever", buildUrl: (slug) => `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json` },
  { provider: "rippling", buildUrl: (slug) => `https://api.rippling.com/platform/api/ats/v1/board/${encodeURIComponent(slug)}/jobs` },
  { provider: "smartrecruiters", buildUrl: (slug) => `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(slug)}/postings` },
  { provider: "workable", buildUrl: (slug) => `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(slug)}` },
];

/**
 * Resolves a company to its ATS board.
 *
 * Tries the careers page first when we have one — it's a single request and gives
 * an exact answer. Falls back to probing name-derived slug candidates, which is
 * noisier but needs nothing but the company name.
 */
export async function detectAts(
  companyName: string,
  careersUrl?: string | null,
  signal?: AbortSignal,
): Promise<DetectedAts | null> {
  if (careersUrl) {
    const fromPage = await detectFromCareersPage(careersUrl, signal);
    if (fromPage) return fromPage;
  }

  return probeSlugCandidates(buildSlugCandidates(companyName), signal);
}

async function detectFromCareersPage(
  careersUrl: string,
  signal?: AbortSignal,
): Promise<DetectedAts | null> {
  let html: string;
  try {
    // The only URL in the scraper that a user types in freely, so it's the only
    // one that needs the SSRF guard — see assert-safe-url.ts.
    html = await atsRateLimiter.schedule(() =>
      fetchText(careersUrl, { signal, requireSafeUrl: true }),
    );
  } catch {
    // An unreachable careers page isn't fatal — fall through to slug probing.
    return null;
  }

  for (const { provider, pattern } of ATS_URL_PATTERNS) {
    const match = html.match(pattern);
    if (match?.[1]) return { provider, slug: match[1].toLowerCase() };
  }

  return null;
}

async function probeSlugCandidates(
  candidates: string[],
  signal?: AbortSignal,
): Promise<DetectedAts | null> {
  for (const slug of candidates) {
    for (const { provider, buildUrl } of PROBE_URL_BUILDERS) {
      if (signal?.aborted) return null;

      try {
        await atsRateLimiter.schedule(() => fetchWithRetry(buildUrl(slug), { signal }));
        return { provider, slug };
      } catch (error) {
        // 404 is the expected answer for most probes — keep going. Anything else
        // (rate limit, network) also just means "try the next candidate".
        if (error instanceof ScrapeError && error.isNotFound) continue;
        continue;
      }
    }
  }

  return null;
}

// "Acme Corp, Inc." → ["acmecorp", "acme-corp", "acme"]
export function buildSlugCandidates(companyName: string): string[] {
  const normalized = companyName
    .toLowerCase()
    .replace(/[&,.']/g, "")
    .replace(/\b(inc|llc|ltd|limited|corp|corporation|co|gmbh|bv|sa|ag|plc)\b/g, "")
    .trim();

  const words = normalized.split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return [];

  const candidates = [
    words.join(""),
    words.join("-"),
    // Many boards drop a generic trailing word ("Stripe Payments" → "stripe").
    words.length > 1 ? words[0] : null,
  ].filter((candidate): candidate is string => Boolean(candidate));

  return [...new Set(candidates)];
}
