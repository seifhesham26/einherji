import { parseHTML } from "linkedom";
import { fetchText } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import { parseScrapedJob, type AggregatorSource, type ScrapedJob } from "../job-source.types";
import { detectIsRemote, normalizeWorkType } from "../normalize-work-type";
import { stripHtml } from "@/utils/strip-html";
import { matchesQuery } from "./match-query";

const WWR_RSS_URL = "https://weworkremotely.com/remote-jobs.rss";

export const weWorkRemotelySource: AggregatorSource = {
  name: "weworkremotely",
  fetchJobs: async (query, signal) => {
    const xml = await atsRateLimiter.schedule(() => fetchText(WWR_RSS_URL, { signal }));
    return parseWeWorkRemotelyFeed(xml).filter((job) => matchesQuery(job, query));
  },
};

/**
 * Parses the We Work Remotely RSS feed.
 *
 * Pure function so it can be tested against a saved fixture. Note it reads the
 * URL from <guid>, not <link>: an HTML parser treats <link> as a void element
 * and drops its text, but <guid> carries the same canonical URL.
 */
export function parseWeWorkRemotelyFeed(xml: string): ScrapedJob[] {
  const { document } = parseHTML(xml);

  return [...document.querySelectorAll("item")]
    .map((item) => {
      const readTag = (selector: string) =>
        item.querySelector(selector)?.textContent?.trim() || null;

      const rawTitle = readTag("title");
      const jobUrl = readTag("guid");
      if (!rawTitle || !jobUrl) return null;

      const { company, title } = splitCompanyAndTitle(rawTitle);
      const region = readTag("region");
      const employmentType = readTag("type");
      const category = readTag("category");
      const description = readTag("description");

      return parseScrapedJob({
        // The slug is stable; the full URL is what guid contains.
        sourceJobId: jobUrl.split("/").filter(Boolean).pop() ?? jobUrl,
        source: "weworkremotely",
        title,
        company,
        jobUrl,
        companyUrl: null,
        location: region,
        salary: null,
        description: description ? stripHtml(description) : null,
        postedAt: readTag("pubDate"),
        workType: normalizeWorkType(employmentType),
        // Everything on this board is remote.
        isRemote: detectIsRemote(region) ?? true,
        tags: category ? [category] : null,
      });
    })
    .filter((job): job is ScrapedJob => job !== null);
}

// Feed titles read "Company: Job Title". Splitting on the first colon keeps
// titles that contain their own colon intact.
function splitCompanyAndTitle(rawTitle: string): { company: string; title: string } {
  const separatorIndex = rawTitle.indexOf(":");
  if (separatorIndex === -1) return { company: "Unknown", title: rawTitle };

  const company = rawTitle.slice(0, separatorIndex).trim();
  const title = rawTitle.slice(separatorIndex + 1).trim();

  if (!company || !title) return { company: "Unknown", title: rawTitle };
  return { company, title };
}
