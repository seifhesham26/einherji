import { and, eq, desc, lte } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import type { LeadStatus, UpdateLeadInput } from "./leads.validators";

export async function getAllLeads(db: Database, userId: string, status?: LeadStatus) {
  const baseWhere = status
    ? and(eq(leads.userId, userId), eq(leads.status, status))
    : eq(leads.userId, userId);

  return db.select().from(leads).where(baseWhere).orderBy(desc(leads.createdAt));
}

export async function getLeadById(db: Database, leadId: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  return lead ?? null;
}

export async function insertLeads(db: Database, userId: string, leadsData: {
  jobId?: string;
  firstName: string;
  lastName?: string | null;
  title?: string | null;
  company: string;
  linkedinUrl?: string | null;
  headline?: string | null;
  about?: string | null;
}[]) {
  if (leadsData.length === 0) return [];
  return db.insert(leads).values(leadsData.map((lead) => ({ ...lead, userId }))).returning();
}

export async function updateLead(db: Database, updateData: UpdateLeadInput) {
  const { id, status, notes, nextActionAt } = updateData;
  const [updated] = await db
    .update(leads)
    .set({
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(nextActionAt && { nextActionAt: new Date(nextActionAt) }),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, id))
    .returning();
  return updated;
}

export async function setLeadMessageSent(db: Database, leadId: string) {
  await db
    .update(leads)
    .set({ status: "message_sent", lastContactedAt: new Date(), updatedAt: new Date() })
    .where(eq(leads.id, leadId));
}

export async function getRecentLeadActivity(db: Database, userId: string, limit = 10) {
  return db
    .select()
    .from(leads)
    .where(eq(leads.userId, userId))
    .orderBy(desc(leads.updatedAt))
    .limit(limit);
}

export async function getOverdueFollowUps(db: Database, userId: string) {
  const now = new Date();
  return db
    .select()
    .from(leads)
    .where(and(eq(leads.userId, userId), lte(leads.nextActionAt, now)))
    .orderBy(leads.nextActionAt);
}
