import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseArrayLeniently } from "./job-source.types";

const recordSchema = z.object({
  id: z.string(),
  tags: z.array(z.string()).nullable().optional(),
});

describe("parseArrayLeniently", () => {
  it("keeps the good records and drops only the bad one", () => {
    // Regression test for a real failure: Arbeitnow ships roughly one record per
    // 175 with `job_types` as an object instead of an array. Validating the array
    // as a whole meant that single record discarded all 175 jobs, and the source
    // silently returned nothing.
    const records = [
      { id: "1", tags: ["react"] },
      { id: "2", tags: { bad: "shape" } },
      { id: "3", tags: null },
    ];

    const parsed = parseArrayLeniently(records, recordSchema);

    expect(parsed).toHaveLength(2);
    expect(parsed.map((record) => record.id)).toEqual(["1", "3"]);
  });

  it("returns an empty array for non-array input rather than throwing", () => {
    expect(parseArrayLeniently(null, recordSchema)).toEqual([]);
    expect(parseArrayLeniently({ not: "an array" }, recordSchema)).toEqual([]);
    expect(parseArrayLeniently(undefined, recordSchema)).toEqual([]);
  });

  it("returns everything when all records are valid", () => {
    const records = [{ id: "1" }, { id: "2" }];
    expect(parseArrayLeniently(records, recordSchema)).toHaveLength(2);
  });

  it("returns nothing when every record is malformed", () => {
    expect(parseArrayLeniently([{ nope: 1 }, { nope: 2 }], recordSchema)).toEqual([]);
  });
});
