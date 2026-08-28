import { describe, expect, it } from "vitest";
import { LIKELY_CLOSED_AFTER_DAYS, daysSinceLastSeen, isLikelyClosed } from "./is-likely-closed";

const MS_PER_DAY = 86_400_000;
const now = new Date("2026-08-28T12:00:00Z");

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * MS_PER_DAY);
}

describe("isLikelyClosed", () => {
  it("leaves a posting seen in the last scrape alone", () => {
    expect(isLikelyClosed(daysAgo(0), now)).toBe(false);
  });

  it("leaves a posting inside the window alone", () => {
    expect(isLikelyClosed(daysAgo(LIKELY_CLOSED_AFTER_DAYS - 1), now)).toBe(false);
  });

  it("flags a posting the boards stopped returning", () => {
    expect(isLikelyClosed(daysAgo(LIKELY_CLOSED_AFTER_DAYS + 1), now)).toBe(true);
  });

  it("does not flag exactly on the boundary", () => {
    // Strictly greater than, so a job seen exactly 21 days ago is still live —
    // the alternative flips a whole day's worth of rows a day early.
    expect(isLikelyClosed(daysAgo(LIKELY_CLOSED_AFTER_DAYS), now)).toBe(false);
  });

  it("says nothing about a row with no timestamp", () => {
    // An absent value is unknown, not stale. Guessing here would grey out rows
    // that predate the column for no reason.
    expect(isLikelyClosed(null, now)).toBe(false);
    expect(isLikelyClosed(undefined, now)).toBe(false);
  });
});

describe("daysSinceLastSeen", () => {
  it("counts whole days", () => {
    expect(daysSinceLastSeen(daysAgo(3), now)).toBe(3);
  });

  it("rounds a part day down to zero", () => {
    expect(daysSinceLastSeen(new Date(now.getTime() - 3600_000), now)).toBe(0);
  });

  it("returns null when there is nothing to measure", () => {
    expect(daysSinceLastSeen(null, now)).toBeNull();
  });
});
