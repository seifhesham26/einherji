import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import {
  parseArrayLeniently,
  parseScrapedJob,
  type JobSearchQuery,
  type ScrapedJob,
} from "../job-source.types";
import { detectIsRemote, normalizeWorkType } from "../normalize-work-type";
import { matchesQuery } from "./match-query";

const TWITTER_SEARCH_URL = "https://api.x.com/2/tweets/search/recent";
const MAX_RESULTS = 50;
// The recent-search endpoint only covers the last 7 days on every tier.
const SEARCH_WINDOW_DAYS = 7;

const tweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  created_at: z.string().nullable().optional(),
  author_id: z.string().nullable().optional(),
});

const twitterUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  username: z.string(),
});

const twitterResponseSchema = z.object({
  data: z.array(z.unknown()).nullable().optional(),
  includes: z.object({ users: z.array(z.unknown()).nullable().optional() }).nullable().optional(),
});

export interface TwitterCredentials {
  bearerToken: string;
}

/**
 * Searches recent tweets for hiring and freelance posts.
 *
 * X's API is paid on every useful tier, so this stays dormant until a bearer
 * token is saved in Settings. Signal-to-noise is lower here than on the job
 * boards — the query below is deliberately narrow to compensate.
 */
export async function fetchTwitterJobs(
  credentials: TwitterCredentials,
  query: JobSearchQuery,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const searchQuery = buildSearchQuery(query);
  if (!searchQuery) return [];

  const params = new URLSearchParams({
    query: searchQuery,
    max_results: String(MAX_RESULTS),
    "tweet.fields": "created_at,author_id",
    expansions: "author_id",
    "user.fields": "name,username",
  });

  const payload = await atsRateLimiter
    .schedule(() =>
      fetchJson(`${TWITTER_SEARCH_URL}?${params.toString()}`, {
        signal,
        accept: "application/json",
        bearerToken: credentials.bearerToken,
      }),
    )
    // An expired token or exhausted quota shouldn't fail the whole run.
    .catch(() => null);

  if (!payload) return [];

  const parsed = twitterResponseSchema.safeParse(payload);
  if (!parsed.success || !parsed.data.data) return [];

  const usersById = new Map(
    parseArrayLeniently(parsed.data.includes?.users ?? [], twitterUserSchema).map((user) => [
      user.id,
      user,
    ]),
  );

  return parseArrayLeniently(parsed.data.data, tweetSchema)
    .map((tweet) => {
      const author = tweet.author_id ? usersById.get(tweet.author_id) : undefined;

      return parseScrapedJob({
        sourceJobId: tweet.id,
        source: "twitter",
        title: firstLine(tweet.text),
        company: author?.name || (author ? `@${author.username}` : "X post"),
        jobUrl: `https://x.com/${author?.username ?? "i"}/status/${tweet.id}`,
        companyUrl: author ? `https://x.com/${author.username}` : null,
        location: null,
        salary: null,
        description: tweet.text,
        postedAt: tweet.created_at ?? null,
        workType: normalizeWorkType(tweet.text),
        isRemote: detectIsRemote(tweet.text),
        tags: null,
      });
    })
    .filter((job): job is ScrapedJob => job !== null)
    .filter((job) => matchesQuery(job, query));
}

// X's query language is compact but strict; keep it tight or the results are junk.
function buildSearchQuery(query: JobSearchQuery): string | null {
  const titles = query.titles.slice(0, 3).map((title) => `"${title}"`);
  if (titles.length === 0) return null;

  const hiringTerms = "(hiring OR \"we're hiring\" OR freelance OR contract)";
  return `${hiringTerms} (${titles.join(" OR ")}) -is:retweet lang:en`;
}

function firstLine(text: string): string {
  const line = text.split("\n")[0].trim();
  const MAX_TITLE_LENGTH = 120;
  return line.length > MAX_TITLE_LENGTH ? `${line.slice(0, MAX_TITLE_LENGTH - 1)}…` : line;
}

export { SEARCH_WINDOW_DAYS };
