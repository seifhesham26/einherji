"use client";

import { trpc } from "@/lib/trpc-client";

/** Counts for the filter chips. Deliberately unaffected by the active filter. */
export function useGetJobStatusCounts(bucketId?: string) {
  return trpc.jobs.getStatusCounts.useQuery({ bucketId });
}
