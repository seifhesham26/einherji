import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import {
  deleteBucket,
  getBucketById,
  getBuckets,
  insertBucket,
  updateBucket,
} from "./buckets.db";
import type { CreateBucketInput, UpdateBucketInput } from "./buckets.validators";

export async function fetchBuckets(db: Database, userId: string) {
  return getBuckets(db, userId);
}

export async function createBucket(db: Database, userId: string, input: CreateBucketInput) {
  const created = await insertBucket(db, userId, input);

  if (!created) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `You already have a bucket called "${input.name}".`,
    });
  }

  return created;
}

export async function editBucket(db: Database, userId: string, input: UpdateBucketInput) {
  const updated = await updateBucket(db, userId, input);
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Bucket not found" });
  return updated;
}

/**
 * Removes a bucket and everything it collected.
 *
 * `jobs.bucket_id` cascades, so deleting a bucket really does clear its results —
 * which is the point. Leads and messages are attached to people rather than to a
 * bucket, so they survive.
 */
export async function removeBucket(db: Database, userId: string, bucketId: string) {
  const deleted = await deleteBucket(db, userId, bucketId);
  if (!deleted) throw new TRPCError({ code: "NOT_FOUND", message: "Bucket not found" });
  return deleted;
}

export async function requireBucket(db: Database, userId: string, bucketId: string) {
  const bucket = await getBucketById(db, userId, bucketId);
  if (!bucket) throw new TRPCError({ code: "NOT_FOUND", message: "Bucket not found" });
  return bucket;
}
