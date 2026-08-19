import { and, eq, desc, lte, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import type { LeadStatus, UpdateLeadInput } from "./leads.validators";

export async function getAllLeads(db: Database, userId: string, status?: LeadStatus) {
  const baseWhere = status
    ? and(eq(leads.userId, userId), eq(leads.status, status))
    : eq(leads.userId, userId);

  return db.select().from(leads).where(baseWhere).orderBy(desc(leads.createdAt));
}

// userId is a required argument on every function in this file, not an optional
// extra — forgetting it then becomes a type error rather than a silent
// cross-tenant read. All four IDOR findings in docs/AUDIT.md were this mistake.
export async function getLeadById(db: Database, userId: string, leadId: string) {
  const [lead] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.id, leadId), eq(leads.userId, userId)))
    .limit(1);
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

// Typed on the table's own shape rather than the form's — the db layer shouldn't
// inherit whether a field happened to be optional in a UI schema.
export interface NewLead {
  firstName: string;
  company: string;
  lastName?: string | null;
  title?: string | null;
  linkedinUrl?: string | null;
  headline?: string | null;
  about?: string | null;
  phone?: string | null;
  placeId?: string | null;
  jobId?: string | null;
  bucketId?: string | null;
}

export async function insertLead(db: Database, userId: string, leadData: NewLead) {
  const [inserted] = await db.insert(leads).values({ ...leadData, userId }).returning();
  return inserted;
}

// Same person, same account. Used to stop a hand-entered lead duplicating one the
// scraper already found — insertLeads has no dedupe of its own (AUDIT M5).
export async function findDuplicateLead(
  db: Database,
  userId: string,
  candidate: { linkedinUrl: string | null; firstName: string; company: string },
) {
  const matchesPerson = candidate.linkedinUrl
    ? eq(leads.linkedinUrl, candidate.linkedinUrl)
    : and(
        // Names and companies vary in case between sources, so compare lowered.
        sql`lower(${leads.firstName}) = lower(${candidate.firstName})`,
        sql`lower(${leads.company}) = lower(${candidate.company})`,
      );

  const [existing] = await db
    .select()
    .from(leads)
    .where(and(eq(leads.userId, userId), matchesPerson))
    .limit(1);

  return existing ?? null;
}

export async function updateLead(db: Database, userId: string, updateData: UpdateLeadInput) {
  const { id, status, notes, nextActionAt } = updateData;
  const [updated] = await db
    .update(leads)
    .set({
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(nextActionAt && { nextActionAt: new Date(nextActionAt) }),
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, id), eq(leads.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function setLeadMessageSent(db: Database, userId: string, leadId: string) {
  await db
    .update(leads)
    .set({ status: "message_sent", lastContactedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(leads.id, leadId), eq(leads.userId, userId)));
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
