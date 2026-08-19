"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetBuckets() {
  return trpc.buckets.getAll.useQuery();
}
