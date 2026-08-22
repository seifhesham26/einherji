"use client";

import { useQueryFilter } from "@/hooks/useQueryFilter";

/**
 * Which bucket the page is filtered to, kept in the URL as `?bucket=`.
 *
 * Jobs, Leads and Tracker each held this in local state, so the same bucket had
 * to be picked again on every page and was lost on every reload. In the URL it
 * survives both, and a bucket view becomes something you can bookmark or send.
 */
export function useBucketFilter() {
  const [bucketId, selectBucket] = useQueryFilter("bucket");
  return { bucketId, selectBucket };
}
