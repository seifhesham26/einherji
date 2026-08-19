"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetReadyToSend() {
  return trpc.messages.getReadyToSend.useQuery();
}
