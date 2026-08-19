import { and, asc, eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { buckets } from "@/lib/db/schema";
import type { CreateBucketInput, UpdateBucketInput } from "./buckets.validators";

export async function getBuckets(db: Database, userId: string, includeArchived = false) {
  const where = includeArchived
    ? eq(buckets.userId, userId)
    : and(eq(buckets.userId, userId), eq(buckets.isArchived, false));

  return db.select().from(buckets).where(where).orderBy(asc(buckets.createdAt));
}

export async function getBucketById(db: Database, userId: string, bucketId: string) {
  const [bucket] = await db
    .select()
    .from(buckets)
    .where(and(eq(buckets.id, bucketId), eq(buckets.userId, userId)))
    .limit(1);
  return bucket ?? null;
}

export async function insertBucket(db: Database, userId: string, bucketData: CreateBucketInput) {
  const [created] = await db
    .insert(buckets)
    .values({ ...bucketData, pitch: bucketData.pitch ?? null, userId })
    // Backed by the (userId, name) unique index — two buckets with the same name
    // would be indistinguishable in the switcher.
    .onConflictDoNothing({ target: [buckets.userId, buckets.name] })
    .returning();
  return created ?? null;
}

export async function updateBucket(
  db: Database,
  userId: string,
  { id, ...changes }: UpdateBucketInput,
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
