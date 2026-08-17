import { and, eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { sourceCredentials } from "@/lib/db/schema";
import type { JobSourceName } from "@/lib/scrapers/job-source.types";

export async function getAllCredentials(db: Database, userId: string) {
  return db
    .select()
    .from(sourceCredentials)
    .where(eq(sourceCredentials.userId, userId));
}

export async function getCredentialsForSource(
  db: Database,
  userId: string,
  source: JobSourceName,
) {
  const [row] = await db
    .select()
    .from(sourceCredentials)
    .where(and(eq(sourceCredentials.userId, userId), eq(sourceCredentials.source, source)))
    .limit(1);
  return row ?? null;
}

export async function upsertCredentials(
  db: Database,
  userId: string,
  source: JobSourceName,
  credentials: Record<string, string>,
) {
  const [saved] = await db
    .insert(sourceCredentials)
    .values({ userId, source, credentials })
    .onConflictDoUpdate({
      target: [sourceCredentials.userId, sourceCredentials.source],
      set: { credentials, updatedAt: new Date() },
    })
    .returning();
  return saved;
}

export async function deleteCredentials(
  db: Database,
  userId: string,
  source: JobSourceName,
) {
  const [deleted] = await db
    .delete(sourceCredentials)
    .where(and(eq(sourceCredentials.userId, userId), eq(sourceCredentials.source, source)))
    .returning();
  return deleted ?? null;
}
