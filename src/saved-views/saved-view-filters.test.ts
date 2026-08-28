import { describe, expect, it } from "vitest";
import { savedViewFiltersSchema } from "./saved-views.validators";

// The filter set is picked from getJobsSchema so the two can't drift, and that
// borrowing is exactly what these tests guard: a change to the jobs query
// shouldn't quietly change what a saved view means.

describe("savedViewFiltersSchema", () => {
  it("stores an empty view as genuinely empty", () => {
    // getJobsSchema defaults sort to "score", and .partial() leaves defaults in
    // place. Without the explicit override every view would be stamped with a
    // sort it never chose — and an unfiltered list would look filtered.
    expect(savedViewFiltersSchema.parse({})).toEqual({});
  });

  it("keeps the filters it was given, unchanged", () => {
    const filters = { minScore: 70, isRemote: true, postedWithinDays: 7, sort: "newest" as const };

    expect(savedViewFiltersSchema.parse(filters)).toEqual(filters);
  });

  it("rejects a sort the list can't perform", () => {
    // The value is read back out of jsonb and handed straight to the query
    // builder, so an unknown sort would reach the database as an ORDER BY.
    expect(savedViewFiltersSchema.safeParse({ sort: "cheapest" }).success).toBe(false);
  });

  it("rejects a score outside the range a job can score", () => {
    expect(savedViewFiltersSchema.safeParse({ minScore: 140 }).success).toBe(false);
  });

  it("does not carry paging, which is a position rather than a question", () => {
    const parsed = savedViewFiltersSchema.parse({ cursor: "72~abc", limit: 90, minScore: 40 });

    expect(parsed).toEqual({ minScore: 40 });
  });

  it("does not carry the bucket, which is a separate axis from the filters", () => {
    // A view that jumped you into another hunt would be the most confusing thing
    // on the page.
    const parsed = savedViewFiltersSchema.parse({ bucketId: "bucket_1", isRemote: true });

    expect(parsed).toEqual({ isRemote: true });
  });
});
