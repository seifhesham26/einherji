"use client";

import { trpc } from "@/lib/trpc-client";
import type { LeadStatus } from "@/leads/leads.validators";

export function useGetLeads(status?: LeadStatus) {
  return trpc.leads.getAll.useQuery({ status });
}
