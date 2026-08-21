"use client";

import { trpc } from "@/lib/trpc-client";
import type { GetLeadsInput } from "@/leads/leads.validators";

/**
 * Contacts, optionally narrowed to one status or one hunt.
 *
 * The bucket filter is server-side rather than a `.filter()` on the result: a
 * hand-built supplier list runs to hundreds of rows, and shipping all of them to
 * throw most away is the wrong default even before it's slow.
 */
export function useGetLeads(filters: GetLeadsInput = {}) {
  return trpc.leads.getAll.useQuery(filters);
}
