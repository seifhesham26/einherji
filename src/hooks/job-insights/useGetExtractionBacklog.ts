"use client";

import { trpc } from "@/lib/trpc-client";

/** How many postings are still unread, for the button that offers to read them. */
export function useGetExtractionBacklog(bucketId?: string) {
  return trpc.jobInsights.getBacklog.useQuery({ bucketId });
}
