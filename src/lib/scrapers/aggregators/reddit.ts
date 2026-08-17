import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import {
  parseArrayLeniently,
  parseScrapedJob,
  type JobSearchQuery,
  type ScrapedJob,
} from "../job-source.types";
import { detectIsRemote } from "../normalize-work-type";
import { stripHtml } from "@/utils/strip-html";
import { matchesQuery } from "./match-query";

const REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token";
const REDDIT_API_BASE = "https://oauth.reddit.com";
const POSTS_PER_SUBREDDIT = 50;

// Subreddits where people post paid work. r/forhire is the big one; the [Hiring]
// prefix convention is what separates clients from job-seekers.
const WORK_SUBREDDITS = ["forhire", "jobbit", "remotejs", "hiring"];

const redditPostSchema = z.object({
  id: z.string(),
  title: z.string(),
  selftext: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  permalink: z.string(),
  created_utc: z.number().nullable().optional(),
  author: z.string().nullable().optional(),
  link_flair_text: z.string().nullable().optional(),
  subreddit: z.string().nullable().optional(),
});

const redditListingSchema = z.object({
  data: z.object({ children: z.array(z.unknown()) }),
});

const redditChildSchema = z.object({ data: redditPostSchema });

const tokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number().optional(),
});

export interface RedditCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Fetches hiring posts from work-related subreddits.
 *
 * Reddit closed off unauthenticated JSON access, so this needs an OAuth app —
 * but the app itself is free, and script-type apps get client-credentials access
 * without a user login.
 */
export async function fetchRedditJobs(
  credentials: RedditCredentials,
  query: JobSearchQuery,
  signal?: AbortSignal,
): Promise<ScrapedJob[]> {
  const accessToken = await requestAccessToken(credentials, signal);
  if (!accessToken) return [];

  const collected: ScrapedJob[] = [];

  for (const subreddit of WORK_SUBREDDITS) {
    if (signal?.aborted) break;

    const payload = await atsRateLimiter
      .schedule(() =>
        fetchJson(`${REDDIT_API_BASE}/r/${subreddit}/new?limit=${POSTS_PER_SUBREDDIT}`, {
          signal,
          accept: "application/json",
          bearerToken: accessToken,
        }),
      )
      // A private or renamed subreddit shouldn't sink the whole source.
      .catch(() => null);

    if (!payload) continue;

    const parsed = redditListingSchema.safeParse(payload);
    if (!parsed.success) continue;

    for (const { data: post } of parseArrayLeniently(
      parsed.data.data.children,
      redditChildSchema,
    )) {
      // [Hiring] posts are clients paying; [For Hire] posts are people seeking
      // work, which is competition rather than a lead.
      if (!isHiringPost(post.title, post.link_flair_text)) continue;

      const scraped = parseScrapedJob({
        sourceJobId: post.id,
        source: "reddit",
        title: cleanTitle(post.title),
        company: `r/${post.subreddit ?? subreddit}`,
        jobUrl: `https://www.reddit.com${post.permalink}`,
        companyUrl: null,
        location: null,
        salary: null,
        description: post.selftext ? stripHtml(post.selftext) : null,
        postedAt: post.created_utc ? new Date(post.created_utc * 1000) : null,
        // These subreddits are overwhelmingly contract/gig work.
        workType: "freelance",
        isRemote: detectIsRemote(post.title, post.selftext) ?? true,
        tags: post.link_flair_text ? [post.link_flair_text] : null,
      });

      if (scraped && matchesQuery(scraped, query)) collected.push(scraped);
    }
  }

  return collected;
}

async function requestAccessToken(
  credentials: RedditCredentials,
  signal?: AbortSignal,
): Promise<string | null> {
  const basicAuth = Buffer.from(
    `${credentials.clientId}:${credentials.clientSecret}`,
  ).toString("base64");

  try {
    const response = await fetch(REDDIT_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        // Reddit rejects generic user agents outright.
        "User-Agent": "einherji-job-hunter/1.0",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      signal,
    });

    if (!response.ok) return null;

    const parsed = tokenResponseSchema.safeParse(await response.json());
    return parsed.success ? parsed.data.access_token : null;
  } catch {
    return null;
  }
}

const HIRING_MARKERS = ["[hiring]", "[hiring ", "hiring:", "[task]"];
const SEEKING_MARKERS = ["[for hire]", "[forhire]", "for hire:"];

function isHiringPost(title: string, flair?: string | null): boolean {
  const haystack = `${title} ${flair ?? ""}`.toLowerCase();
  if (SEEKING_MARKERS.some((marker) => haystack.includes(marker))) return false;
  return HIRING_MARKERS.some((marker) => haystack.includes(marker));
}

function cleanTitle(title: string): string {
  return title.replace(/^\s*\[[^\]]+\]\s*/, "").trim() || title;
}
