"use client";

import { trpc } from "@/lib/trpc-client";

/**
 * The job, its history and the company's other open roles.
 *
 * Disabled until a job is actually selected, because the panel's id is null
 * whenever it's closed and a query for "no job" is a guaranteed 404.
 */
export function useGetJobDetail(jobId: string | null) {
  return trpc.jobs.getDetail.useQuery(
    { jobId: jobId ?? "" },
    {
      enabled: Boolean(jobId),
      // The panel opens on a key press while the user is moving down the list.
      // Refetching a job they've already read is a request for nothing.
      staleTime: 30_000,
    },
  );
}
