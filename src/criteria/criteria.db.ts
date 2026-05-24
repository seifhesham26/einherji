import { and, eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { criteria } from "@/lib/db/schema";
import type { SaveCriteriaInput } from "./criteria.validators";

export async function getActiveCriteria(db: Database, userId: string) {
  const [result] = await db
    .select()
    .from(criteria)
    .where(and(eq(criteria.userId, userId), eq(criteria.isActive, true)))
    .limit(1);
  return result ?? null;
}

export async function deactivateUserCriteria(db: Database, userId: string) {
  await db
    .update(criteria)
    .set({ isActive: false })
    .where(eq(criteria.userId, userId));
}

export async function insertCriteria(db: Database, criteriaData: SaveCriteriaInput & { userId: string }) {
  const [inserted] = await db
    .insert(criteria)
    .values({
      ...criteriaData,
      titles: criteriaData.titles,
      locations: criteriaData.locations,
      isActive: true,
    })
    .returning();
  return inserted;
}
