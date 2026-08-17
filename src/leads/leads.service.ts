import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { getAllLeads, updateLead, getRecentLeadActivity, getOverdueFollowUps } from "./leads.db";
import type { GetLeadsInput, UpdateLeadInput } from "./leads.validators";

export async function fetchLeads(db: Database, userId: string, input: GetLeadsInput) {
  return getAllLeads(db, userId, input.status);
}

export async function patchLead(db: Database, userId: string, updateData: UpdateLeadInput) {
  const updated = await updateLead(db, userId, updateData);
  // Now that the update is scoped, "no rows changed" means the lead either
  // doesn't exist or belongs to someone else. Both answer the same way, so the
  // response can't be used to probe for other people's lead ids.
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  return updated;
}

export async function fetchRecentActivity(db: Database, userId: string) {
  return getRecentLeadActivity(db, userId);
}

export async function fetchOverdueFollowUps(db: Database, userId: string) {
  return getOverdueFollowUps(db, userId);
}
