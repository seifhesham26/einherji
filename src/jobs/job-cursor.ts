import type { JobSort } from "./jobs.validators";

/**
 * Where the next page of jobs starts.
 *
 * Keyset rather than an offset. New jobs arrive at the top of exactly the
 * ordering the list uses, and with an offset that pushes every later page down
 * by one — so page two repeats a row page one already showed. The cursor names
 * the last row instead of counting past it, so a page boundary stays put no
 * matter what arrives above it.
 *
 * The sort value alone can't be the cursor: hundreds of jobs share a score, and
 * a cursor that can't break the tie either loses rows or repeats them. The id
 * comes along as the tiebreaker, and the ORDER BY carries it for the same reason.
 */

/** The value a null score sorts as, so ORDER BY and the cursor agree on it. */
export const UNSCORED_SORTS_LAST = -1;

// A tilde, because it appears in neither a cuid2 (lowercase alphanumeric) nor an
// ISO timestamp nor an integer — so the first occurrence is always the real one.
const CURSOR_SEPARATOR = "~";

export interface CursorPosition {
  value: string;
  id: string;
}

export interface CursorableJob {
  id: string;
  score: number | null;
  postedAt: Date | null;
  createdAt: Date | null;
}

export function encodeJobCursor(job: CursorableJob, sort: JobSort): string {
  const value =
    sort === "score"
      ? String(job.score ?? UNSCORED_SORTS_LAST)
      // Mirrors coalesce(posted_at, created_at) in the query. A row falling back
      // to a different column here than the ORDER BY does is a silently skipped
      // page.
      : (job.postedAt ?? job.createdAt ?? new Date(0)).toISOString();

  return `${value}${CURSOR_SEPARATOR}${job.id}`;
}

/**
 * Reads a cursor back, or null if it can't be trusted.
 *
 * Cursors come from the client, so a malformed one is a normal thing to receive
 * rather than an exception. Null means "start from the beginning", which shows
 * the user the first page instead of an error page.
 */
export function decodeJobCursor(cursor: string, sort: JobSort): CursorPosition | null {
  const separatorAt = cursor.indexOf(CURSOR_SEPARATOR);
  if (separatorAt <= 0) return null;

  const value = cursor.slice(0, separatorAt);
  const id = cursor.slice(separatorAt + 1);
  if (id.length === 0) return null;

  // The value is interpolated into a typed comparison, so it has to be the type
  // that sort actually orders by.
  if (sort === "score") {
    return Number.isNaN(Number.parseInt(value, 10)) ? null : { value, id };
  }

  return Number.isNaN(new Date(value).getTime()) ? null : { value, id };
}
