import { z } from "zod";
import { fetchJson } from "../http/fetch-with-retry";
import { atsRateLimiter } from "../http/rate-limiter";
import {
  parseScrapedJob,
  type AggregatorSource,
  type JobSourceName,
  type ScrapedJob,
} from "../job-source.types";
import { detectIsRemote, normalizeWorkType } from "../normalize-work-type";
import { stripHtml } from "@/utils/strip-html";
import { matchesQuery } from "./match-query";

const ALGOLIA_BASE = "https://hn.algolia.com/api/v1";
// The monthly hiring threads are posted by a dedicated account; the freelance
// thread is posted by a different one.
const HIRING_THREAD_AUTHOR = "whoishiring";
const FREELANCE_THREAD_AUTHOR = "jon_north";
const MAX_COMMENTS = 200;

const hnStorySchema = z.object({
  objectID: z.string(),
  title: z.string(),
  created_at: z.string(),
});

const hnCommentSchema = z.object({
  objectID: z.string(),
  comment_text: z.string().nullable(),
  author: z.string().nullable().optional(),
  created_at: z.string(),
  parent_id: z.union([z.number(), z.string()]).nullable(),
  story_id: z.union([z.number(), z.string()]).nullable(),
});

const searchResponseSchema = z.object({ hits: z.array(z.unknown()) });

// ─── Sources ──────────────────────────────────────────────────────────────────

export const hackerNewsSource: AggregatorSource = {
  name: "hackernews",
  fetchJobs: async (query, signal) => {
    const thread = await findLatestThread(HIRING_THREAD_AUTHOR, /who is hiring/i, signal);
    if (!thread) return [];

    const comments = await fetchTopLevelComments(thread.objectID, signal);
    return comments
      .map((comment) => toScrapedJob(comment, "hackernews", thread.objectID))
      .filter((job): job is ScrapedJob => job !== null)
      .filter((job) => matchesQuery(job, query));
  },
};

export const hackerNewsFreelanceSource: AggregatorSource = {
  name: "hackernews_freelance",
  fetchJobs: async (query, signal) => {
    const thread = await findLatestThread(FREELANCE_THREAD_AUTHOR, /seeking freelancer/i, signal);
    if (!thread) return [];

    const comments = await fetchTopLevelComments(thread.objectID, signal);

    return comments
      // The thread mixes clients hiring ("SEEKING FREELANCER") with freelancers
      // advertising ("SEEKING WORK"). Only the former is a lead.
      .filter((comment) => isSeekingFreelancer(comment.comment_text))
      .map((comment) => toScrapedJob(comment, "hackernews_freelance", thread.objectID))
      .filter((job): job is ScrapedJob => job !== null)
      .filter((job) => matchesQuery(job, query));
  },
};

// ─── Fetching ─────────────────────────────────────────────────────────────────

async function findLatestThread(author: string, titlePattern: RegExp, signal?: AbortSignal) {
  // search_by_date, not search: relevance ranking returns threads from years ago.
  const payload = await atsRateLimiter.schedule(() =>
    fetchJson(`${ALGOLIA_BASE}/search_by_date?tags=story,author_${author}&hitsPerPage=10`, {
      signal,
    }),
  );

  const parsed = searchResponseSchema.safeParse(payload);
  if (!parsed.success) return null;

  for (const hit of parsed.data.hits) {
    const story = hnStorySchema.safeParse(hit);
    if (story.success && titlePattern.test(story.data.title)) return story.data;
  }

  return null;
}

async function fetchTopLevelComments(storyId: string, signal?: AbortSignal) {
  const payload = await atsRateLimiter.schedule(() =>
    fetchJson(`${ALGOLIA_BASE}/search?tags=comment,story_${storyId}&hitsPerPage=${MAX_COMMENTS}`, {
      signal,
    }),
  );

  const parsed = searchResponseSchema.safeParse(payload);
  if (!parsed.success) return [];

  return parsed.data.hits
    .map((hit) => hnCommentSchema.safeParse(hit))
    .filter((result) => result.success)
    .map((result) => result.data)
    // Only top-level comments are postings; the rest are replies and chatter.
    .filter((comment) => String(comment.parent_id) === String(comment.story_id))
    .filter((comment) => Boolean(comment.comment_text));
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function toScrapedJob(
  comment: z.infer<typeof hnCommentSchema>,
  source: JobSourceName,
  threadId: string,
): ScrapedJob | null {
  const text = stripHtml(comment.comment_text ?? "");
  if (!text) return null;

  const { company, title } = parseHeadline(text);

  return parseScrapedJob({
    sourceJobId: comment.objectID,
    source,
    title,
    company,
    // Deep-links to the individual comment rather than the thread.
    jobUrl: `https://news.ycombinator.com/item?id=${comment.objectID}`,
    companyUrl: null,
    location: extractLocation(text),
    salary: extractSalary(text),
    description: text,
    postedAt: comment.created_at,
    workType:
      source === "hackernews_freelance"
        ? "freelance"
        : normalizeWorkType(firstLine(text)),
    isRemote: detectIsRemote(firstLine(text)),
    tags: [`hn:${threadId}`],
  });
}

const JOB_TITLE_HINTS = [
  "engineer", "developer", "designer", "manager", "scientist", "analyst",
  "architect", "lead", "director", "devops", "sre", "founding", "intern",
];

const LOCATION_MARKERS = ["remote", "onsite", "on-site", "hybrid", "worldwide", "anywhere"];

/**
 * Extracts company and role from an HN posting headline.
 *
 * The convention is "Company | Role | Location | REMOTE | Salary", but it's a
 * convention rather than a rule — plenty of posts lead with the role and never
 * name the company. This is a best-effort heuristic, so it prefers leaving
 * company as "Unknown" over confidently mislabelling a job title as a company.
 */
export function parseHeadline(text: string): { company: string; title: string } {
  const segments = firstLine(text)
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) return { company: "Unknown", title: truncate(firstLine(text)) };
  if (segments.length === 1) return { company: "Unknown", title: truncate(segments[0]) };

  const [first, second] = segments;

  // A leading segment that reads like a role means the company wasn't given.
  if (looksLikeJobTitle(first) && !looksLikeJobTitle(second)) {
    return { company: "Unknown", title: truncate(first) };
  }

  return { company: truncate(first), title: truncate(second) };
}

function looksLikeJobTitle(segment: string): boolean {
  const lower = segment.toLowerCase();
  return JOB_TITLE_HINTS.some((hint) => lower.includes(hint));
}

function extractLocation(text: string): string | null {
  const segments = firstLine(text).split("|").map((segment) => segment.trim());

  const locationSegment = segments.find((segment) => {
    const lower = segment.toLowerCase();
    if (LOCATION_MARKERS.some((marker) => lower.includes(marker))) return true;
    // "Seattle, WA" — a comma with short trailing token reads as a place.
    return /^[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}\b/.test(segment);
  });

  return locationSegment ? truncate(locationSegment) : null;
}

const SALARY_PATTERN = /\$\s?\d[\d,.]*\s?[kK]?(\s?[–\-—to]+\s?\$?\d[\d,.]*\s?[kK]?)?/;

function extractSalary(text: string): string | null {
  const match = firstLine(text).match(SALARY_PATTERN);
  return match ? match[0].trim() : null;
}

// Clients hiring say "SEEKING FREELANCER"; freelancers advertising say
// "SEEKING WORK". Only the first kind is a lead for us.
function isSeekingFreelancer(commentText: string | null): boolean {
  if (!commentText) return false;
  const headline = firstLine(stripHtml(commentText)).toLowerCase();
  if (headline.includes("seeking work")) return false;
  return headline.includes("seeking freelancer") || headline.includes("seeking a freelancer");
}

function firstLine(text: string): string {
  return text.split("\n")[0].trim();
}

const MAX_FIELD_LENGTH = 120;

function truncate(value: string): string {
  return value.length > MAX_FIELD_LENGTH ? `${value.slice(0, MAX_FIELD_LENGTH - 1)}…` : value;
}
