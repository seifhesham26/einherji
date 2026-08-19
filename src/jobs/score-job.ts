import {
  haystackContains,
  normalizeForMatch,
  significantWords,
} from "@/lib/scrapers/aggregators/match-query";
import type { JobSearchQuery } from "@/lib/scrapers/job-source.types";

/**
 * How well a stored job fits the user's criteria, 0–100.
 *
 * `matchesQuery` answers yes or no, which is the right question when deciding
 * what to store. It's the wrong question once several hundred rows are stored and
 * all of them said yes — date order then buries the good ones among the merely
 * eligible. This ranks what survived that filter.
 *
 * Deliberately simple and explainable: every point is attributable to a stated
 * reason, so a surprising ranking can be argued with rather than just distrusted.
 */

const TITLE_MATCH_WEIGHT = 45;
const RECENCY_WEIGHT = 25;
const SALARY_WEIGHT = 10;
const REMOTE_WEIGHT = 10;
const DESCRIPTION_WEIGHT = 10;

// Roughly how long a posting stays worth acting on. Past this, recency scores 0
// — most roles are filled or stale by then.
const RECENCY_HORIZON_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export interface ScorableJob {
  title: string;
  tags?: string[] | null;
  salary?: string | null;
  description?: string | null;
  isRemote?: boolean | null;
  postedAt?: Date | null;
  createdAt?: Date | null;
}

export interface JobScore {
  score: number;
  reasons: string[];
}

export function scoreJob(job: ScorableJob, query: JobSearchQuery): JobScore {
  const reasons: string[] = [];
  let score = 0;

  // ── Title and tags ──
  // The share of the user's search terms actually present, not just whether one
  // was. "React Developer" matching both words is a better fit than one.
  const haystack = normalizeForMatch([job.title, ...(job.tags ?? [])].join(" "));
  const terms = query.titles.flatMap((title) => significantWords(title));
  const uniqueTerms = [...new Set(terms)];

  if (uniqueTerms.length > 0) {
    const matched = uniqueTerms.filter((term) => haystackContains(haystack, term));
    const share = matched.length / uniqueTerms.length;
    score += Math.round(share * TITLE_MATCH_WEIGHT);

    if (matched.length > 0) {
      reasons.push(`matches ${matched.slice(0, 3).join(", ")}`);
    }
  } else {
    // No criteria to judge against — don't punish every job for it.
    score += TITLE_MATCH_WEIGHT;
  }

  // ── Recency ──
  const posted = job.postedAt ?? job.createdAt ?? null;
  if (posted) {
    const ageDays = (Date.now() - posted.getTime()) / MS_PER_DAY;
    const freshness = Math.max(0, 1 - ageDays / RECENCY_HORIZON_DAYS);
    score += Math.round(freshness * RECENCY_WEIGHT);

    if (ageDays <= 2) reasons.push("posted in the last 48 hours");
  }

  // ── Actionability ──
  // A listing you can judge and act on beats one you have to go and research.
  if (job.salary) {
    score += SALARY_WEIGHT;
    reasons.push("salary listed");
  }
  if (job.isRemote) {
    score += REMOTE_WEIGHT;
    reasons.push("remote");
  }
  if (job.description && job.description.length > 200) {
    score += DESCRIPTION_WEIGHT;
  }

  return { score: Math.min(score, 100), reasons };
}

/** Highest scoring first. Ties break towards the more recent posting. */
export function rankJobs<T extends ScorableJob>(
  jobs: T[],
  query: JobSearchQuery,
): (T & { score: number; reasons: string[] })[] {
  return jobs
    .map((job) => ({ ...job, ...scoreJob(job, query) }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      const leftDate = (left.postedAt ?? left.createdAt)?.getTime() ?? 0;
      const rightDate = (right.postedAt ?? right.createdAt)?.getTime() ?? 0;
      return rightDate - leftDate;
    });
}
