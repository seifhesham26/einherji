"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetJobEvents(jobId: string, isEnabled = true) {
  return trpc.jobs.getEvents.useQuery({ jobId }, { enabled: isEnabled });
}
