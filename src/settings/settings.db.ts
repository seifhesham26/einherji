import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import type { Database } from "@/lib/db";
import { userSettings } from "@/lib/db/schema";

export async function getSettingsByUserId(db: Database, userId: string) {
  const [settings] = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId));
  return settings ?? null;
}

export async function upsertUserSettings(
  db: Database,
  userId: string,
  data: Partial<Omit<typeof userSettings.$inferInsert, "id" | "userId" | "createdAt" | "updatedAt">>,
) {
  const [result] = await db
    .insert(userSettings)
    .values({ id: createId(), userId, ...data })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return result;
}
