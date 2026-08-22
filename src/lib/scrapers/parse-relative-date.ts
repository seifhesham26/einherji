// Google Jobs (and several boards that syndicate through it) report age rather
// than a date — "3 days ago", "30+ days ago". Handing that string straight to
// `z.coerce.date()` produces an Invalid Date, which fails scrapedJobSchema and
// silently drops the whole job. Converting it here is what keeps those listings.
const RELATIVE_PATTERN = /(\d+)\s*\+?\s*(minute|hour|day|week|month|year)s?\s+ago/i;

const MILLISECONDS_PER_UNIT: Record<string, number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 604_800_000,
  month: 2_592_000_000,
  year: 31_536_000_000,
};

/**
 * Turns "3 days ago" into an absolute Date, or null when the text isn't a
 * relative age. `now` is injectable so tests don't depend on the wall clock.
 */
export function parseRelativeDate(text: string | null | undefined, now = new Date()): Date | null {
  if (!text) return null;

  const trimmed = text.trim();
  if (/^(just now|today)$/i.test(trimmed)) return now;
  if (/^yesterday$/i.test(trimmed)) return new Date(now.getTime() - MILLISECONDS_PER_UNIT.day);

  const match = RELATIVE_PATTERN.exec(trimmed);
  if (!match) {
    // Not relative — it may still be a real date the caller can use as-is.
    const absolute = new Date(trimmed);
    return Number.isNaN(absolute.getTime()) ? null : absolute;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount) || !MILLISECONDS_PER_UNIT[unit]) return null;

  return new Date(now.getTime() - amount * MILLISECONDS_PER_UNIT[unit]);
}
