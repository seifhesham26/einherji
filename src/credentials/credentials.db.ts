import { and, eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { sourceCredentials } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret-box";
import type { JobSourceName } from "@/lib/scrapers/job-source.types";

// Secrets are encrypted on the way in and decrypted on the way out, so nothing
// above this file has to remember to do it — and nothing below it ever holds a
// readable key. Keys are left alone; only values are encrypted, which keeps the
// jsonb shape intact and inspectable.
function encryptValues(credentials: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(credentials).map(([field, value]) => [field, encryptSecret(value)]),
  );
}

function decryptValues(credentials: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(credentials).map(([field, value]) => [field, decryptSecret(value)]),
  );
}

export async function getAllCredentials(db: Database, userId: string) {
  const rows = await db
    .select()
    .from(sourceCredentials)
    .where(eq(sourceCredentials.userId, userId));

  return rows.map((row) => ({ ...row, credentials: decryptValues(row.credentials) }));
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
  return row ? { ...row, credentials: decryptValues(row.credentials) } : null;
}

export async function upsertCredentials(
  db: Database,
  userId: string,
  source: JobSourceName,
  credentials: Record<string, string>,
) {
  const encrypted = encryptValues(credentials);

  const [saved] = await db
    .insert(sourceCredentials)
    .values({ userId, source, credentials: encrypted })
    .onConflictDoUpdate({
      target: [sourceCredentials.userId, sourceCredentials.source],
      set: { credentials: encrypted, updatedAt: new Date() },
    })
    .returning();

  // Hand back what the caller passed in, not the ciphertext it just wrote.
  return { ...saved, credentials };
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
