"use client";

import { trpc } from "@/lib/trpc-client";

export function useGetCompanies() {
  return trpc.companies.getAll.useQuery();
}
