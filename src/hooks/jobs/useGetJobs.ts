"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetJobs(processed?: boolean) {
  return trpc.jobs.getAll.useQuery({ processed });
}
