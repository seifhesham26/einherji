"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetActiveCriteria() {
  return trpc.criteria.getActive.useQuery();
}
