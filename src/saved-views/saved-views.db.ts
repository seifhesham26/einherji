import { and, asc, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { savedViews } from "@/lib/db/schema";
import type { SavedViewFilters } from "./saved-views.validators";

export async function getSavedViews(db: Database, userId: string) {
  return db
    .select()
    .from(savedViews)
    .where(eq(savedViews.userId, userId))
    // Position first, created second — two views added in the same request would
    // otherwise come back in whatever order the planner felt like.
    .orderBy(asc(savedViews.position), asc(savedViews.createdAt));
}

export async function countSavedViews(db: Database, userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(savedViews)
    .where(eq(savedViews.userId, userId));

  return row?.total ?? 0;
}

export async function insertSavedView(
  db: Database,
  userId: string,
  view: { name: string; filters: SavedViewFilters; position: number },
) {
  const [inserted] = await db.insert(savedViews).values({ userId, ...view }).returning();
  return inserted ?? null;
}

export async function updateSavedView(
  db: Database,
  userId: string,
  viewId: string,
  changes: { name?: string; filters?: SavedViewFilters },
) {
  // An update with nothing in it would generate `SET` and nothing after it,
  // which is a syntax error rather than a no-op.
  if (changes.name === undefined && changes.filters === undefined) return null;

  const [updated] = await db
    .update(savedViews)
    .set(changes)
    .where(and(eq(savedViews.id, viewId), eq(savedViews.userId, userId)))
    .returning();

  return updated ?? null;
}

export async function deleteSavedView(db: Database, userId: string, viewId: string) {
  const [deleted] = await db
    .delete(savedViews)
    .where(and(eq(savedViews.id, viewId), eq(savedViews.userId, userId)))
    .returning();

  return deleted ?? null;
}
