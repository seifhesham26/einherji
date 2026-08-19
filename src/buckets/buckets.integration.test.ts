import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { config } from "dotenv";

config({ path: ".env.local" });

const isEnabled =
  process.env.SCRAPER_INTEGRATION === "1" && Boolean(process.env.SCRAPER_TEST_USER_ID);
const describeIntegration = isEnabled ? describe : describe.skip;

const userId = `bucket-test-${Date.now()}`;
const otherUserId = `bucket-other-${Date.now()}`;

beforeAll(async () => {
  if (!isEnabled) return;
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  await db.insert(users).values(
    [userId, otherUserId].map((id) => ({
      id,
      name: id,
      email: `${id}@invalid.test`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );
});

afterAll(async () => {
  if (!isEnabled) return;
  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");
  const { inArray } = await import("drizzle-orm");

  await db.delete(users).where(inArray(users.id, [userId, otherUserId]));
});

describeIntegration("buckets (live, writes to db)", () => {
  it("keeps separate searches apart", async () => {
    const { db } = await import("@/lib/db");
    const { createBucket, fetchBuckets } = await import("./buckets.service");

    await createBucket(db, userId, {
      name: "Jobs for me",
      kind: "jobs",
      keywords: ["react developer"],
      locations: ["Remote"],
      sources: ["remoteok"],
    });
    await createBucket(db, userId, {
      name: "Dad's paper factory",
      kind: "clients",
      keywords: ["مهندس", "engineering"],
      locations: ["Cairo"],
      sources: [],
    });

    const mine = await fetchBuckets(db, userId);
    expect(mine).toHaveLength(2);
    // Each keeps its own keywords — the whole reason buckets exist.
    expect(mine.find((b) => b.kind === "clients")?.keywords).toContain("مهندس");
    expect(mine.find((b) => b.kind === "jobs")?.keywords).toContain("react developer");
  }, 60_000);

  it("refuses two buckets with the same name", async () => {
    const { db } = await import("@/lib/db");
    const { createBucket } = await import("./buckets.service");

    await expect(
      createBucket(db, userId, { name: "Jobs for me", kind: "jobs", keywords: [], locations: [], sources: [] }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  }, 60_000);

  it("does not treat another account's bucket name as taken", async () => {
    const { db } = await import("@/lib/db");
    const { createBucket } = await import("./buckets.service");

    await expect(
      createBucket(db, otherUserId, { name: "Jobs for me", kind: "jobs", keywords: [], locations: [], sources: [] }),
    ).resolves.toBeDefined();
  }, 60_000);

  it("will not open another account's bucket", async () => {
    const { db } = await import("@/lib/db");
    const { fetchBuckets, requireBucket } = await import("./buckets.service");

    const [theirs] = await fetchBuckets(db, otherUserId);
    await expect(requireBucket(db, userId, theirs.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  }, 60_000);

  // Deleting a bucket is meant to clear what it collected, via the cascade on
  // jobs.bucket_id — otherwise its results linger with no way to reach them.
  it("takes its jobs with it when deleted", async () => {
    const { db } = await import("@/lib/db");
    const { jobs } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const { createBucket, removeBucket } = await import("./buckets.service");
    const { insertJobs } = await import("@/jobs/jobs.db");

    const bucket = await createBucket(db, userId, {
      name: `Temp ${Date.now()}`,
      kind: "custom",
      keywords: ["x"],
      locations: [],
      sources: [],
    });

    await insertJobs(db, userId, [{
      sourceJobId: `bucket-job-${Date.now()}`,
      source: "remoteok",
      title: "Test",
      company: "Test Co",
      jobUrl: "https://example.com/j",
      companyUrl: null, location: null, salary: null, description: null,
      postedAt: null, workType: "unknown", isRemote: null, tags: null,
      attributionText: null, attributionUrl: null,
    }], bucket.id);

    expect(await db.select().from(jobs).where(eq(jobs.bucketId, bucket.id))).toHaveLength(1);

    await removeBucket(db, userId, bucket.id);
    expect(await db.select().from(jobs).where(eq(jobs.bucketId, bucket.id))).toHaveLength(0);
  }, 60_000);
});
