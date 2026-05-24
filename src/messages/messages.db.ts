import { and, eq, desc, gte } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { messages, leads, jobs } from "@/lib/db/schema";
import type { MessageStatus, MessageTemplate } from "./messages.validators";

export async function getMessages(db: Database, userId: string, status: MessageStatus = "draft") {
  return db
    .select({ message: messages, lead: leads, job: jobs })
    .from(messages)
    .leftJoin(leads, eq(messages.leadId, leads.id))
    .leftJoin(jobs, eq(messages.jobId, jobs.id))
    .where(and(eq(messages.userId, userId), eq(messages.status, status)))
    .orderBy(desc(messages.createdAt));
}

export async function getDraftForLead(db: Database, userId: string, leadId: string) {
  const [existing] = await db
    .select()
    .from(messages)
    .where(and(eq(messages.userId, userId), eq(messages.leadId, leadId), eq(messages.status, "draft")))
    .limit(1);
  return existing ?? null;
}

export async function upsertDraftMessage(db: Database, userId: string, messageData: {
  leadId: string;
  jobId?: string | null;
  body: string;
  templateUsed: MessageTemplate;
}) {
  const existing = await getDraftForLead(db, userId, messageData.leadId);

  if (existing) {
    // Replace existing draft — regeneration shouldn't stack up multiple drafts
    const [updated] = await db
      .update(messages)
      .set({ body: messageData.body, templateUsed: messageData.templateUsed })
      .where(eq(messages.id, existing.id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(messages)
    .values({ ...messageData, userId, status: "draft" })
    .returning();
  return inserted;
}

export async function approveMessage(db: Database, messageId: string, editedBody?: string) {
  const [updated] = await db
    .update(messages)
    .set({
      status: editedBody ? "edited" : "approved",
      approvedAt: new Date(),
      ...(editedBody && { editedBody }),
    })
    .where(eq(messages.id, messageId))
    .returning();
  return updated ?? null;
}

export async function getApprovedTodayCount(db: Database, userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.userId, userId),
        eq(messages.status, "approved"),
        gte(messages.approvedAt, today),
      )
    );
  return results.length;
}
