"use client";

import { trpc } from "@/lib/trpc-client";

/**
 * A stored fit report, if one has been run.
 *
 * A read, so opening a job never spends a completion. Generating one is a
 * separate, explicit action.
 */
export function useGetFitReport(jobId: string | null) {
  return trpc.jobInsights.getFitReport.useQuery(
    { jobId: jobId ?? "" },
    { enabled: Boolean(jobId) },
  );
}
