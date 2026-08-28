/**
 * Whether a posting has probably come down.
 *
 * Nothing expires today, so a three-month-old Jobs page is mostly filled roles
 * that look identical to live ones. There is no endpoint that reports "this
 * listing is closed", so the signal has to be indirect: every scrape refreshes
 * `lastSeenAt` on the rows it re-encounters, and a row whose timestamp has
 * stopped moving is one the boards have stopped returning.
 *
 * It's a flag, not a verdict — hence the name. A job is dimmed and labelled,
 * never hidden or deleted, because the inference has two honest failure modes:
 * the user may simply not have scraped for a while, and a source the job came
 * from may have been switched off since.
 */

// Long enough that a fortnight of not opening the app doesn't grey out the whole
// list, short enough to catch a posting inside the window it stays fillable.
export const LIKELY_CLOSED_AFTER_DAYS = 21;

const MS_PER_DAY = 86_400_000;

export function isLikelyClosed(
  lastSeenAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  // Rows that predate the column carry the migration's backfill, so this is only
  // reachable for a genuinely absent value — which we can't judge, so we don't.
  if (!lastSeenAt) return false;

  return now.getTime() - lastSeenAt.getTime() > LIKELY_CLOSED_AFTER_DAYS * MS_PER_DAY;
}

/** How long ago a posting was last confirmed, in whole days. */
export function daysSinceLastSeen(
  lastSeenAt: Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!lastSeenAt) return null;

  return Math.floor((now.getTime() - lastSeenAt.getTime()) / MS_PER_DAY);
}
