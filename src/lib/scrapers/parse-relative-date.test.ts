import { describe, expect, it } from "vitest";
import { parseRelativeDate } from "./parse-relative-date";

const NOW = new Date("2026-08-22T12:00:00.000Z");

describe("parseRelativeDate", () => {
  // Regression: Google Jobs reports age, not dates. Passing "3 days ago" to
  // z.coerce.date() yields an Invalid Date, which fails scrapedJobSchema and
  // silently drops the entire listing rather than just the date.
  it("converts the ages Google Jobs actually returns", () => {
    expect(parseRelativeDate("3 days ago", NOW)?.toISOString()).toBe("2026-08-19T12:00:00.000Z");
    expect(parseRelativeDate("2 hours ago", NOW)?.toISOString()).toBe("2026-08-22T10:00:00.000Z");
    expect(parseRelativeDate("1 week ago", NOW)?.toISOString()).toBe("2026-08-15T12:00:00.000Z");
  });

  // Google writes "30+ days ago" once a posting passes a month.
  it("handles the plus form", () => {
    expect(parseRelativeDate("30+ days ago", NOW)?.toISOString()).toBe("2026-07-23T12:00:00.000Z");
  });

  it("handles the word forms", () => {
    expect(parseRelativeDate("just now", NOW)).toEqual(NOW);
    expect(parseRelativeDate("Yesterday", NOW)?.toISOString()).toBe("2026-08-21T12:00:00.000Z");
  });

  it("passes an absolute date straight through", () => {
    expect(parseRelativeDate("2026-08-01T00:00:00.000Z", NOW)?.toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("returns null for empty or unparseable text rather than an Invalid Date", () => {
    expect(parseRelativeDate(null, NOW)).toBeNull();
    expect(parseRelativeDate("", NOW)).toBeNull();
    expect(parseRelativeDate("sometime soon", NOW)).toBeNull();
  });
});
