import { fetchText } from "../http/fetch-with-retry";
import { linkedInRateLimiter } from "../http/rate-limiter";
import { CircuitOpenError, ScrapeError } from "../http/scrape-error";
import {
  parseScrapedJob,
  type JobSearchQuery,
  type JobSource,
  type JobSourceContext,
  type ScrapedJob,
} from "../job-source.types";
import { parseJobCards } from "./parse-job-card";
import { parseJobDetail } from "./parse-job-detail";

const LINKEDIN_GUEST_BASE = "https://www.linkedin.com/jobs-guest/jobs/api";
const RESULTS_PER_PAGE = 10;
const MAX_RESULTS_PER_QUERY = 100;
const DEFAULT_DAYS_POSTED = 7;

const SECONDS_PER_DAY = 86_400;

export const linkedInJobSource: JobSource = {
  name: "linkedin_guest",
  search: searchLinkedInJobs,
};

/**
 * Streams jobs from LinkedIn's logged-out search endpoint.
 *
 * Two-pass by design: the search fragment carries everything except the
 * description, so we only spend a second request on jobs we haven't already
 * stored. On a repeat run that skips almost every detail fetch, which is both
 * the main speed win and the main politeness lever.
 */
async function* searchLinkedInJobs(
  query: JobSearchQuery,
  context: JobSourceContext,
): AsyncGenerator<ScrapedJob> {
  // The same job surfaces under multiple title/location pairs; this keeps us from
  // fetching its detail page more than once per run.
  const seenInThisRun = new Set<string>();

  for (const title of query.titles) {
    for (const location of query.locations) {
      for (let start = 0; start < MAX_RESULTS_PER_QUERY; start += RESULTS_PER_PAGE) {
        if (context.signal.aborted) return;

        let html: string;
        try {
          html = await linkedInRateLimiter.schedule(() =>
            fetchText(buildSearchUrl(title, location, start, query.daysPosted), {
              signal: context.signal,
              referer: "https://www.linkedin.com/jobs",
            }),
          );
        } catch (error) {
          // A tripped breaker means LinkedIn is actively blocking us — abandon the
          // whole source rather than working through the remaining permutations.
          if (error instanceof CircuitOpenError) return;
          if (error instanceof ScrapeError) break;
          throw error;
        }

        const cards = parseJobCards(html);
        if (cards.length === 0) break;

        for (const card of cards) {
          if (context.signal.aborted) return;
          if (seenInThisRun.has(card.sourceJobId)) continue;
          seenInThisRun.add(card.sourceJobId);

          // Already stored, so skip the detail request entirely. It isn't yielded
          // either: the insert would be a no-op against the unique index, and
          // counting it as "found" would overstate what the run actually did.
          if (context.existingSourceJobIds.has(card.sourceJobId)) continue;

          const detail = await fetchJobDetail(card.sourceJobId, context.signal);

          const job = parseScrapedJob({
            ...card,
            description: detail?.description ?? null,
            salary: detail?.salary ?? card.salary,
          });

          if (job) yield job;
        }

        if (cards.length < RESULTS_PER_PAGE) break;
      }
    }
  }
}

async function fetchJobDetail(sourceJobId: string, signal: AbortSignal) {
  try {
    const html = await linkedInRateLimiter.schedule(() =>
      fetchText(`${LINKEDIN_GUEST_BASE}/jobPosting/${encodeURIComponent(sourceJobId)}`, {
        signal,
        referer: "https://www.linkedin.com/jobs",
      }),
    );
    return parseJobDetail(html);
  } catch {
    // A missing description shouldn't cost us the job — the card data is still
    // worth storing, and the user can open the posting.
    return null;
  }
}

function buildSearchUrl(
  title: string,
  location: string,
  start: number,
  daysPosted = DEFAULT_DAYS_POSTED,
): string {
  const params = new URLSearchParams({
    keywords: title,
    location,
    start: String(start),
    // LinkedIn expects the recency window in seconds, prefixed with "r".
    f_TPR: `r${daysPosted * SECONDS_PER_DAY}`,
  });

  return `${LINKEDIN_GUEST_BASE}/seeMoreJobPostings/search?${params.toString()}`;
}
