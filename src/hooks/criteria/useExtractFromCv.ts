"use client";

import { trpc } from "@/lib/trpc-client";

export function useExtractFromCv() {
  return trpc.criteria.extractFromCv.useMutation();
}
