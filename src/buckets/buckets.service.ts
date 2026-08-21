import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { isUniqueViolation } from "@/utils/is-unique-violation";
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
  const created = await insertBucket(db, userId, {
    ...input,
    pitch: normalisePitch(input.pitch) ?? null,
  });

  if (!created) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `You already have a bucket called "${input.name}".`,
    });
  }

  return created;
}

/**
 * Applies a partial change to one bucket.
 *
 * Only the keys the caller actually sent are written: `updateBucketSchema` is
 * built so an omitted field stays absent, and Drizzle skips undefined in `set`.
 * Both halves matter — see the note on that schema for the way this reads
 * correct and behaves otherwise.
 */
export async function editBucket(db: Database, userId: string, input: UpdateBucketInput) {
  const changes = "pitch" in input ? { ...input, pitch: normalisePitch(input.pitch) } : input;

  const updated = await updateBucket(db, userId, changes).catch((error) => {
    // Renaming onto another bucket's name hits the (userId, name) unique index.
    // Unhandled, that surfaces as a 500 carrying the whole SQL statement.
    if (isUniqueViolation(error)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: `You already have a bucket called "${input.name}".`,
      });
    }
    throw error;
  });

  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Bucket not found" });
  return updated;
}

/**
 * Removes a bucket and the search results filed under it.
 *
 * `jobs.bucket_id` cascades, so deleting a bucket really does clear its listings —
 * which is the point; they're search results, reproducible by scraping again.
 *
 * Leads do *not* go with it. `leads.bucket_id` is ON DELETE SET NULL, so contacts
 * survive and fall back to the unfiled list. It shipped as cascade in migration
 * 0010, which meant deleting a bucket destroyed every contact in it and every
 * message written to them — a hand-built list of 200 suppliers, gone to one
 * click. Migration 0011 corrects it.
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

// A cleared textarea submits "", which would read as "there is a pitch" at
// generation time and hand the model an empty sender background.
function normalisePitch(pitch: string | undefined): string | null | undefined {
  if (pitch === undefined) return undefined;
  return pitch.trim() || null;
}
