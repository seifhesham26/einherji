import { describe, expect, it } from "vitest";
import { createBucketSchema, updateBucketSchema } from "./buckets.validators";

// A partial update that isn't partial is silent and total: the request succeeds,
// the response looks right, and the bucket's whole search is gone. The obvious
// spelling — `createBucketSchema.partial()` — does exactly that, because Zod
// still applies a `.default()` it finds under the `.partial()` wrapper. These
// tests exist to stop anyone rewriting it that way.

describe("updateBucketSchema", () => {
  it("leaves omitted fields absent instead of defaulting them", () => {
    const parsed = updateBucketSchema.parse({ id: "bucket_1", name: "Renamed" });

    expect(parsed).toEqual({ id: "bucket_1", name: "Renamed" });
    // The keys must not merely be undefined — Drizzle skips undefined, but any
    // caller reading `"sources" in changes` would be told a wipe was requested.
    expect("keywords" in parsed).toBe(false);
    expect("locations" in parsed).toBe(false);
    expect("sources" in parsed).toBe(false);
    expect("kind" in parsed).toBe(false);
  });

  it("still writes the fields that were sent", () => {
    const parsed = updateBucketSchema.parse({
      id: "bucket_1",
      sources: ["remoteok"],
      keywords: ["react developer"],
    });

    expect(parsed.sources).toEqual(["remoteok"]);
    expect(parsed.keywords).toEqual(["react developer"]);
    expect("name" in parsed).toBe(false);
  });

  // Clearing the box has to be distinguishable from not touching it, or a pitch
  // can be written and never removed.
  it("keeps a deliberately blanked pitch as an empty string", () => {
    const parsed = updateBucketSchema.parse({ id: "bucket_1", pitch: "   " });

    expect(parsed.pitch).toBe("");
    expect("pitch" in parsed).toBe(true);
  });
});

describe("createBucketSchema", () => {
  // Create wants the opposite behaviour, and must keep it.
  it("fills in defaults for a new bucket", () => {
    const parsed = createBucketSchema.parse({ name: "Dad's paper factory" });

    expect(parsed).toMatchObject({
      name: "Dad's paper factory",
      kind: "jobs",
      keywords: [],
      locations: [],
      sources: [],
    });
  });
});
