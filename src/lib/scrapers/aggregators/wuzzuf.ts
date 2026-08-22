import { parseHTML } from "linkedom";
import { fetchText } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseScrapedJob, type AggregatorSource, type ScrapedJob } from "../job-source.types";
import { detectIsRemote, normalizeWorkType } from "../normalize-work-type";
import { parseRelativeDate } from "../parse-relative-date";
import { haystackContains, matchesQuery, normalizeForMatch, significantWords } from "./match-query";

// Wuzzuf is the dominant Egyptian job board and the reason this source exists —
// Adzuna, Arbeitnow and the remote boards have no Egypt coverage at all.
//
// It has no public API, and its search page is off limits twice over: robots.txt
// carries `Disallow: /*?q=`, and Cloudflare enforces that with a JS challenge.
// So this reads the sitemap Wuzzuf publishes for crawlers instead, which is
// explicitly allowed, needs no challenge, and lists every live job with its
// lastmod. Job detail pages are allowed too and are server-rendered in full.
const WUZZUF_SITEMAP_URL = "https://wuzzuf.net/sitemap-job-1.xml";

// Detail pages are ~700KB of React bundle wrapped around the content, and a run
// has a 60s budget shared with every other source. The slug filter below does
// the selecting, so this cap is only ever reached by a very broad search.
const MAX_DETAIL_PAGES = 20;

export const wuzzufSource: AggregatorSource = {
  name: "wuzzuf",
  fetchJobs: async (query, signal) => {
    const sitemap = await atsRateLimiter.schedule(() =>
      // Honest user agent: this is a declared crawl path, so there is nothing to
      // disguise and Wuzzuf's operators can identify the traffic.
      fetchText(WUZZUF_SITEMAP_URL, { signal, identifyAsApp: true, accept: "application/xml" }),
    );

    // The slug carries title, company and city, so the whole feed can be narrowed
    // before spending a single detail request on it.
    const candidates = selectMatchingUrls(parseSitemapUrls(sitemap), query.titles, query.locations);

    const collected: ScrapedJob[] = [];

    for (const candidate of candidates.slice(0, MAX_DETAIL_PAGES)) {
      if (signal?.aborted) break;

      try {
        const html = await atsRateLimiter.schedule(() =>
          fetchText(candidate.url, { signal, identifyAsApp: true }),
        );

        const job = parseWuzzufJobPage(html, candidate.url, candidate.lastModified);
        // The slug filter is a prefilter on abbreviated text; the real check runs
        // against the parsed record, like every other source.
        if (job && matchesQuery(job, query)) collected.push(job);
      } catch {
        // A single expired posting 404ing is normal — the sitemap is generated
        // ahead of the crawl. Nothing here is worth failing the source over.
        continue;
      }
    }

    return collected;
  },
};

export interface SitemapEntry {
  url: string;
  lastModified: string | null;
}

export function parseSitemapUrls(xml: string): SitemapEntry[] {
  const { document } = parseHTML(xml);

  return [...document.querySelectorAll("url")]
    .map((entry) => ({
      url: entry.querySelector("loc")?.textContent?.trim() ?? "",
      lastModified: entry.querySelector("lastmod")?.textContent?.trim() || null,
    }))
    .filter((entry) => entry.url.includes("/jobs/p/"));
}

/**
 * Narrows the sitemap to the jobs worth fetching, newest first.
 *
 * Slugs read `{id}-{title}-{company}-{city}-{country}`, so both the keyword and
 * the location filter can run on the URL alone. That matters a lot here: the
 * sitemap is ~5,600 jobs and each detail page is most of a megabyte.
 */
export function selectMatchingUrls(
  entries: SitemapEntry[],
  titles: string[],
  locations: string[],
): SitemapEntry[] {
  const titleWords = titles.flatMap(significantWords);
  const locationWords = locations
    .filter((location) => !/remote|anywhere|worldwide/i.test(location))
    .flatMap(significantWords);

  return entries
    .filter((entry) => {
      const slug = normalizeForMatch(slugOf(entry.url).replace(/-/g, " "));

      const matchesTitle =
        titleWords.length === 0 || titleWords.some((word) => haystackContains(slug, word));
      const matchesLocation =
        locationWords.length === 0 || locationWords.some((word) => haystackContains(slug, word));

      return matchesTitle && matchesLocation;
    })
    .sort((left, right) => (right.lastModified ?? "").localeCompare(left.lastModified ?? ""));
}

const WUZZUF_ORIGIN = "https://wuzzuf.net";

// The header renders engagement type and workplace type as links to Wuzzuf's own
// browse pages — "/a/Full-Time-Jobs-in-Egypt", "/a/On-Site-Jobs-in-Egypt". Those
// hrefs are the most durable signal on the page: they're real navigation, unlike
// the emotion class hashes, and unlike the "Job Details" table whose values are
// filled in client-side and so are empty in the server response.
const BROWSE_LINK_PATTERN = /^\/a\/(.+?)-Jobs-in-/;

// "posted 19 days ago", in the header block next to the title.
const POSTED_AGE_PATTERN = /posted\s+(.+?ago)/i;

// Wuzzuf's meta description is templated: "…Explore job Accounting/Finance job
// opportunities in leading companies…". That category is the only server-rendered
// classification on the page, and it earns its place by widening title matching.
const CATEGORY_PATTERN = /Explore job\s+(.+?)\s+job opportunities/i;

/**
 * Reads a job out of a Wuzzuf detail page.
 *
 * Deliberately anchored on the h1, the og: meta tags, real hrefs and heading
 * *text* rather than CSS classes: Wuzzuf renders with emotion, so every class is
 * a content hash ("css-1cen1cg") that changes on each deploy. The SEO metadata
 * and navigation are the parts they have a standing reason to keep stable.
 */
export function parseWuzzufJobPage(
  html: string,
  jobUrl: string,
  lastModified: string | null,
): ScrapedJob | null {
  const { document } = parseHTML(html);

  // Emotion inlines its stylesheets as <style> next to the content it styles, so
  // textContent on any container is full of CSS unless they're removed first.
  for (const node of [...document.querySelectorAll("style, script, noscript")]) node.remove();

  const readMeta = (property: string) =>
    document
      .querySelector(`meta[property="${property}"], meta[name="${property}"]`)
      ?.getAttribute("content")
      ?.trim() || null;

  // "Sr. Banking & Treasury job at Flex Asepto in 6th of October, Giza - Apply on Wuzzuf"
  const pageTitle = readMeta("og:title") ?? document.querySelector("title")?.textContent ?? "";
  const fromPageTitle = splitPageTitle(pageTitle);

  const heading = document.querySelector("h1");
  const title = heading?.textContent?.replace(/\s+/g, " ").trim() || fromPageTitle?.title;
  if (!title) return null;

  const companyLink = document.querySelector('a[href^="/jobs/careers/"]');
  const companyHref = companyLink?.getAttribute("href");
  const company = pickCompanyName(
    companyLink?.textContent?.replace(/\s+/g, " ").trim() ?? null,
    fromPageTitle?.company ?? null,
  );

  const location =
    [readMeta("og:locality"), readMeta("og:region"), readMeta("og:country_name")]
      .filter(Boolean)
      .join(", ") || fromPageTitle?.location || null;

  // Header text carries the type badges and the posting age together.
  const headerText = heading?.parentElement?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const browseLabels = readBrowseLabels(document);

  const description = [
    readSectionText(document, "Job Description"),
    readSectionText(document, "Job Requirements"),
  ]
    .filter(Boolean)
    .join("\n\n");

  const category = CATEGORY_PATTERN.exec(readMeta("description") ?? "")?.[1] ?? null;

  return parseScrapedJob({
    sourceJobId: slugOf(jobUrl),
    source: "wuzzuf",
    title,
    company,
    jobUrl: readMeta("og:url") ?? jobUrl,
    companyUrl: companyHref ? `${WUZZUF_ORIGIN}${companyHref}` : null,
    location,
    salary: null,
    description: description || readMeta("description"),
    // "posted 19 days ago" is the real posting date. The sitemap's lastmod is the
    // fallback — it tracks the crawl, not the posting, so it's always today.
    postedAt: parseRelativeDate(POSTED_AGE_PATTERN.exec(headerText)?.[1]) ?? lastModified,
    // Read from the badges only. Running this over the description matched
    // "internal policies" and filed a senior treasury role as an internship.
    workType: normalizeWorkType(...browseLabels),
    isRemote: detectIsRemote(...browseLabels, location),
    tags: category ? [category] : null,
  });
}

// Wuzzuf truncates long company names in the header link — "RAQMU for Building
// and C…" — so a stored lead would carry a name that matches nothing. The <title>
// spells it out in full, and is only wrong when the page has no company link.
const TRUNCATION_SUFFIX = /(\.{3}|…)$/;

function pickCompanyName(fromLink: string | null, fromPageTitle: string | null): string {
  if (fromLink && !TRUNCATION_SUFFIX.test(fromLink)) return fromLink;
  return fromPageTitle || fromLink || "Unknown";
}

// "/a/Full-Time-Jobs-in-Egypt" → "Full Time", "/a/On-Site-Jobs-in-Egypt" → "On Site".
function readBrowseLabels(document: Document): string[] {
  return [...document.querySelectorAll('a[href^="/a/"]')]
    .map((link) => BROWSE_LINK_PATTERN.exec(link.getAttribute("href") ?? "")?.[1])
    .filter((label): label is string => Boolean(label))
    .map((label) => label.replace(/-/g, " "));
}

const PAGE_TITLE_PATTERN = /^(.*?)\s+job at\s+(.*?)\s+in\s+(.*?)\s*[-–—|]\s*Apply on Wuzzuf\s*$/i;

// Falls back to a looser split so a tweak to the marketing suffix costs us the
// location rather than the whole record.
function splitPageTitle(
  pageTitle: string,
): { title: string; company: string; location: string | null } | null {
  const cleaned = pageTitle.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  const match = PAGE_TITLE_PATTERN.exec(cleaned);
  if (match) return { title: match[1], company: match[2], location: match[3] };

  const looseMatch = /^(.*?)\s+job at\s+(.*?)(?:\s+in\s+(.*))?$/i.exec(
    cleaned.replace(/\s*[-–—|]\s*Apply on Wuzzuf\s*$/i, ""),
  );
  if (!looseMatch) return null;

  return { title: looseMatch[1], company: looseMatch[2], location: looseMatch[3] ?? null };
}

// Finds the heading carrying this text and returns the text of the block it
// labels, with the heading itself removed.
function readSectionText(document: Document, headingText: string): string | null {
  const heading = [...document.querySelectorAll("h1, h2, h3, h4")].find(
    (candidate) => candidate.textContent?.trim().toLowerCase() === headingText.toLowerCase(),
  );

  const body = heading?.parentElement?.textContent?.replace(/\s+/g, " ").trim();
  if (!body) return null;

  const headingEnd = body.toLowerCase().indexOf(headingText.toLowerCase()) + headingText.length;
  return body.slice(headingEnd).trim() || null;
}

function slugOf(jobUrl: string): string {
  return jobUrl.split("/jobs/p/")[1]?.split(/[?#]/)[0] ?? jobUrl;
}
