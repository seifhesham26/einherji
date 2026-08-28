import { and, desc, eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { jobDocuments } from "@/lib/db/schema";
import type { JobDocumentKind } from "./job-documents.validators";

// Every query takes userId first and filters on it — ownership belongs in the
// WHERE clause, not in a service check that can be forgotten.

export async function getJobDocuments(db: Database, userId: string, jobId: string) {
  return db
    .select()
    .from(jobDocuments)
    .where(and(eq(jobDocuments.userId, userId), eq(jobDocuments.jobId, jobId)))
    .orderBy(desc(jobDocuments.createdAt));
}

export async function insertJobDocument(
  db: Database,
  userId: string,
  document: {
    jobId: string;
    kind: JobDocumentKind;
    prompt: string | null;
    body: string;
    model: string;
  },
) {
  // Inserted, never upserted. An application asks four different questions, and
  // two drafts of a cover letter are two things worth comparing — unlike a fit
  // report, which is one current answer.
  const [inserted] = await db.insert(jobDocuments).values({ userId, ...document }).returning();
  return inserted;
}

export async function deleteJobDocument(db: Database, userId: string, documentId: string) {
  const [deleted] = await db
    .delete(jobDocuments)
    .where(and(eq(jobDocuments.id, documentId), eq(jobDocuments.userId, userId)))
    .returning({ id: jobDocuments.id });

  return deleted ?? null;
}
