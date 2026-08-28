"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetJobDocuments(jobId: string | null) {
  return trpc.jobDocuments.getForJob.useQuery(
    { jobId: jobId ?? "" },
    { enabled: Boolean(jobId) },
  );
}
