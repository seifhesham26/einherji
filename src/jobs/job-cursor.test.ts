import { describe, expect, it } from "vitest";
import {
  UNSCORED_SORTS_LAST,
  decodeJobCursor,
  encodeJobCursor,
  type CursorableJob,
} from "./job-cursor";

function job(overrides: Partial<CursorableJob> = {}): CursorableJob {
  return {
    id: "abc123",
    score: 72,
    postedAt: new Date("2026-08-20T09:00:00Z"),
    createdAt: new Date("2026-08-21T09:00:00Z"),
    ...overrides,
  };
}

describe("encodeJobCursor", () => {
  it("carries the score and the id for a score sort", () => {
    const position = decodeJobCursor(encodeJobCursor(job(), "score"), "score");

    expect(position).toEqual({ value: "72", id: "abc123" });
  });

  it("uses the posted date for a date sort", () => {
    const position = decodeJobCursor(encodeJobCursor(job(), "newest"), "newest");

    expect(position?.value).toBe("2026-08-20T09:00:00.000Z");
  });

  it("falls back to createdAt exactly as the query does", () => {
    // The ORDER BY is coalesce(posted_at, created_at). A cursor that fell back to
    // anything else would skip or repeat a page at the boundary.
    const position = decodeJobCursor(
      encodeJobCursor(job({ postedAt: null }), "newest"),
      "newest",
    );

    expect(position?.value).toBe("2026-08-21T09:00:00.000Z");
  });

  it("encodes an unscored job as the sentinel the query sorts it by", () => {
    const position = decodeJobCursor(encodeJobCursor(job({ score: null }), "score"), "score");

    expect(position?.value).toBe(String(UNSCORED_SORTS_LAST));
  });

  it("survives an id that is longer than the value", () => {
    const longId = "c".repeat(40);
    const position = decodeJobCursor(encodeJobCursor(job({ id: longId }), "score"), "score");

    expect(position?.id).toBe(longId);
  });
});

describe("decodeJobCursor", () => {
  it("rejects a cursor with no separator", () => {
    expect(decodeJobCursor("nonsense", "score")).toBeNull();
  });

  it("rejects a cursor with no id", () => {
    expect(decodeJobCursor("72~", "score")).toBeNull();
  });

  it("rejects a cursor with no value", () => {
    expect(decodeJobCursor("~abc123", "score")).toBeNull();
  });

  it("rejects a score cursor that isn't a number", () => {
    // It gets interpolated into a typed comparison, so a non-number would be a
    // database error rather than an empty page.
    expect(decodeJobCursor("banana~abc123", "score")).toBeNull();
  });

  it("rejects a date cursor that isn't a date", () => {
    expect(decodeJobCursor("banana~abc123", "newest")).toBeNull();
  });

  it("accepts a negative score, which is the unscored sentinel", () => {
    expect(decodeJobCursor("-1~abc123", "score")).toEqual({ value: "-1", id: "abc123" });
  });
});
