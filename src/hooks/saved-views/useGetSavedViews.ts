"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetSavedViews() {
  return trpc.savedViews.getAll.useQuery();
}
