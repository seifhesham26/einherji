import { parseHTML } from "linkedom";
import { scrapedJobSummarySchema, type ScrapedJobSummary } from "../job-source.types";

const JOB_URN_PREFIX = "urn:li:jobPosting:";

const SELECTORS = {
  card: "div.job-search-card, div.base-search-card--link",
  title: "h3.base-search-card__title",
  companyLink: "h4.base-search-card__subtitle a",
  location: "span.job-search-card__location",
  listDate: "time.job-search-card__listdate, time.job-search-card__listdate--new",
  fullLink: "a.base-card__full-link",
} as const;

/**
 * Parses the HTML fragment returned by LinkedIn's logged-out job search endpoint.
 *
 * Pure function — HTML in, jobs out, no I/O — so it can be tested against the
 * saved fixtures without touching the network. That matters because this is the
 * part most likely to break: LinkedIn changes this markup without notice.
 */
export function parseJobCards(html: string): ScrapedJobSummary[] {
  const { document } = parseHTML(html);

  return [...document.querySelectorAll(SELECTORS.card)]
    .map((card) => {
      const companyLink = card.querySelector(SELECTORS.companyLink);

      const candidate = {
        sourceJobId: readJobId(card),
        source: "linkedin_guest",
        title: readText(card, SELECTORS.title),
        company: companyLink?.textContent?.trim() || null,
        companyUrl: stripTrackingParams(companyLink?.getAttribute("href")),
        location: readText(card, SELECTORS.location),
        jobUrl: stripTrackingParams(
          card.querySelector(SELECTORS.fullLink)?.getAttribute("href"),
        ),
        postedAt: card.querySelector(SELECTORS.listDate)?.getAttribute("datetime") ?? null,
        salary: null,
      };

      const parsed = scrapedJobSummarySchema.safeParse(candidate);
      return parsed.success ? parsed.data : null;
    })
    .filter((job): job is ScrapedJobSummary => job !== null);
}

function readJobId(card: Element): string | null {
  const urn = card.getAttribute("data-entity-urn");
  if (!urn?.startsWith(JOB_URN_PREFIX)) return null;
  return urn.slice(JOB_URN_PREFIX.length) || null;
}

function readText(card: Element, selector: string): string | null {
  return card.querySelector(selector)?.textContent?.trim() || null;
}

/**
 * LinkedIn appends a fresh `refId` and `trackingId` to every URL on every request.
 * Left in place, the same job looks different on each scrape — which breaks
 * dedupe and bloats the table with near-duplicates.
 */
export function stripTrackingParams(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}
