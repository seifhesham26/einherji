"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetMuteRules() {
  return trpc.muteRules.getAll.useQuery();
}
