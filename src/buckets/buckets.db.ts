import { and, asc, count, eq, isNotNull } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { buckets, jobs, leads } from "@/lib/db/schema";
import type { CreateBucketInput, UpdateBucketInput } from "./buckets.validators";

/**
 * Every bucket with what it has actually produced.
 *
 * The counts are the point: a switcher of bare names says nothing about which
 * hunts are working.
 *
 * Three queries rather than one, for two reasons. Joining both children in a
 * single statement fans out — a bucket with 4 jobs and 3 leads reports 12 of
 * each. And a correlated subquery has to be written as raw SQL, where Drizzle
 * does not table-qualify an interpolated column in select position: `where
 * ${jobs.bucketId} = ${buckets.id}` renders as `where "bucket_id" = "id"`, and
 * since `jobs` has an `id` of its own, the inner scope captures it and every
 * count comes back 0. Two grouped aggregates can't be read wrong, run in
 * parallel, and are served by jobs_bucket_idx / leads_bucket_idx.
 */
export async function getBuckets(db: Database, userId: string, includeArchived = false) {
  const where = includeArchived
    ? eq(buckets.userId, userId)
    : and(eq(buckets.userId, userId), eq(buckets.isArchived, false));

  const [rows, jobCounts, leadCounts] = await Promise.all([
    db.select().from(buckets).where(where).orderBy(asc(buckets.createdAt)),

    db
      .select({ bucketId: jobs.bucketId, total: count() })
      .from(jobs)
      .where(and(eq(jobs.userId, userId), isNotNull(jobs.bucketId)))
      .groupBy(jobs.bucketId),

    db
      .select({ bucketId: leads.bucketId, total: count() })
      .from(leads)
      .where(and(eq(leads.userId, userId), isNotNull(leads.bucketId)))
      .groupBy(leads.bucketId),
  ]);

  const jobCountByBucket = new Map(jobCounts.map((row) => [row.bucketId, row.total]));
  const leadCountByBucket = new Map(leadCounts.map((row) => [row.bucketId, row.total]));

  return rows.map((bucket) => ({
    ...bucket,
    jobCount: jobCountByBucket.get(bucket.id) ?? 0,
    leadCount: leadCountByBucket.get(bucket.id) ?? 0,
  }));
}

export async function getBucketById(db: Database, userId: string, bucketId: string) {
  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, bucketId), eq(buckets.userId, userId)))
    .limit(1);
  return bucket ?? null;
}

// The service clears a blank pitch to null before it gets here, so these widen
// the schema types — which only know `string | undefined` — to allow it.
type NewBucket = Omit<CreateBucketInput, "pitch"> & { pitch: string | null };
type BucketChanges = Omit<UpdateBucketInput, "pitch"> & { pitch?: string | null };

export async function insertBucket(db: Database, userId: string, bucketData: NewBucket) {
  const [created] = await db
    .insert(buckets)
    .values({ ...bucketData, userId })
    // Backed by the (userId, name) unique index — two buckets with the same name
    // would be indistinguishable in the switcher.
    .onConflictDoNothing({ target: [buckets.userId, buckets.name] })
    .returning();
  return created ?? null;
}

export async function updateBucket(
  db: Database,
  userId: string,
  { id, ...changes }: BucketChanges,
) {
  const [updated] = await db
    .update(buckets)
    .set({ ...changes, updatedAt: new Date() })
    .where(and(eq(buckets.id, id), eq(buckets.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteBucket(db: Database, userId: string, bucketId: string) {
  const [deleted] = await db
    .delete(buckets)
    .where(and(eq(buckets.id, bucketId), eq(buckets.userId, userId)))
    .returning({ id: buckets.id });
  return deleted ?? null;
}
