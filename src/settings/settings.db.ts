import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";
import { decryptOptionalSecret, encryptOptionalSecret } from "@/lib/crypto/secret-box";

// The two columns on this table that hold third-party keys. Listed once so a new
// secret column can't be added without a decision about encrypting it.
type SettingsRow = typeof userSettings.$inferSelect;

function decryptSecrets(settings: SettingsRow): SettingsRow {
  return {
    ...settings,
    apifyApiToken: decryptOptionalSecret(settings.apifyApiToken),
    scrapingProxyApiKey: decryptOptionalSecret(settings.scrapingProxyApiKey),
  };
}

export async function getSettingsByUserId(db: Database, userId: string) {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return settings ? decryptSecrets(settings) : null;
}

export async function upsertUserSettings(
  db: Database,
  userId: string,
  data: Partial<Omit<typeof userSettings.$inferInsert, "id" | "userId" | "createdAt" | "updatedAt">>,
) {
  // Only re-encrypt fields actually present in this update — a partial write
  // must not blank a secret it wasn't given.
  const encrypted = {
    ...data,
    ...("apifyApiToken" in data
      ? { apifyApiToken: encryptOptionalSecret(data.apifyApiToken) }
      : {}),
    ...("scrapingProxyApiKey" in data
      ? { scrapingProxyApiKey: encryptOptionalSecret(data.scrapingProxyApiKey) }
      : {}),
  };

  const [result] = await db
    .insert(userSettings)
    .values({ id: createId(), userId, ...encrypted })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...encrypted, updatedAt: new Date() },
    })
    .returning();

  return decryptSecrets(result);
}
