import type { Database } from "@/lib/db";
import { getAllLeads, updateLead, getRecentLeadActivity, getOverdueFollowUps } from "./leads.db";
import type { GetLeadsInput, UpdateLeadInput } from "./leads.validators";

export async function fetchLeads(db: Database, userId: string, input: GetLeadsInput) {
  return getAllLeads(db, userId, input.status);
}

export async function patchLead(db: Database, updateData: UpdateLeadInput) {
  return updateLead(db, updateData);
}

export async function fetchRecentActivity(db: Database, userId: string) {
  return getRecentLeadActivity(db, userId);
}

export async function fetchOverdueFollowUps(db: Database, userId: string) {
  return getOverdueFollowUps(db, userId);
}
