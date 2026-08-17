"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetCredentialStatuses() {
  return trpc.credentials.getStatuses.useQuery();
}
