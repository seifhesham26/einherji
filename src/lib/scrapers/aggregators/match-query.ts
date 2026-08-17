import type { JobSearchQuery, ScrapedJob, WorkType } from "../job-source.types";

// Most aggregators hand back their entire current feed with no server-side
// keyword filter, so the matching happens here. Kept in one place so every
// source filters identically — otherwise "React" would mean something different
// depending on which board a job came from.

const REMOTE_LOCATION_HINTS = ["remote", "anywhere", "worldwide", "distributed"];

/**
 * True when a job plausibly matches what the user asked for.
 *
 * Deliberately lenient on titles: a search for "Frontend Engineer" should still
 * surface "Senior Frontend Developer", so any single significant word matching is
 * enough. Being too strict here silently hides good results, which is much worse
 * than showing a few extra.
 */
export function matchesQuery(job: ScrapedJob, query: JobSearchQuery): boolean {
  return matchesTitle(job, query.titles) && matchesLocation(job, query.locations) && matchesWorkType(job, query.workTypes);
}

function matchesTitle(job: ScrapedJob, titles: string[]): boolean {
  if (titles.length === 0) return true;

  const haystack = [job.title, ...(job.tags ?? [])].join(" ").toLowerCase();

  return titles.some((title) => {
    const words = significantWords(title);
    if (words.length === 0) return true;
    return words.some((word) => haystack.includes(word));
  });
}

function matchesLocation(job: ScrapedJob, locations: string[]): boolean {
  if (locations.length === 0) return true;

  // A remote job satisfies any location filter — that's the point of remote.
  if (job.isRemote) return true;
  if (!job.location) return true;

  const jobLocation = job.location.toLowerCase();
  if (REMOTE_LOCATION_HINTS.some((hint) => jobLocation.includes(hint))) return true;

  return locations.some((location) => {
    const normalized = location.toLowerCase();
    if (REMOTE_LOCATION_HINTS.some((hint) => normalized.includes(hint))) return true;
    // Match on the city or country alone, so "Cairo, Egypt" matches "Cairo".
    return significantWords(location).some((word) => jobLocation.includes(word));
  });
}

function matchesWorkType(job: ScrapedJob, workTypes?: WorkType[]): boolean {
  if (!workTypes || workTypes.length === 0) return true;
  // Sources often can't tell us, and dropping every unlabelled job would throw
  // away most of the feed.
  if (job.workType === "unknown") return true;
  return workTypes.includes(job.workType);
}

// Drops filler that would match nearly everything ("senior engineer" shouldn't
// match on "senior" alone) and anything too short to be meaningful.
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "senior", "junior", "mid", "level", "staff",
  "principal", "lead", "i", "ii", "iii", "remote", "of", "in", "at",
]);

const MIN_WORD_LENGTH = 3;

export function significantWords(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((word) => word.length >= MIN_WORD_LENGTH && !STOP_WORDS.has(word));
}
