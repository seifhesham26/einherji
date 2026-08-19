"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetJobs(filters: { processed?: boolean; bucketId?: string } = {}) {
  return trpc.jobs.getAll.useQuery(filters);
}
