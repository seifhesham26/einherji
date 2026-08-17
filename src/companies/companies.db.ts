import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { trackedCompanies } from "@/lib/db/schema";
import type { AtsProvider } from "./companies.validators";

// Every query here takes userId first and filters on it. Ownership belongs in the
// WHERE clause, not in a service-layer check that's easy to forget.

export async function getTrackedCompanies(db: Database, userId: string) {
  return db
    .select()
    .from(trackedCompanies)
    .where(eq(trackedCompanies.userId, userId))
    .orderBy(asc(trackedCompanies.name));
}

// Only companies we've resolved to a board can actually be scraped.
export async function getResolvedCompanies(db: Database, userId: string) {
  return db
    .select()
    .from(trackedCompanies)
    .where(
      and(
        eq(trackedCompanies.userId, userId),
        isNotNull(trackedCompanies.atsProvider),
        isNotNull(trackedCompanies.atsSlug),
      ),
    )
    .orderBy(asc(trackedCompanies.name));
}

export async function getCompanyById(db: Database, userId: string, companyId: string) {
  const [company] = await db
    .select()
    .from(trackedCompanies)
    .where(and(eq(trackedCompanies.id, companyId), eq(trackedCompanies.userId, userId)))
    .limit(1);
  return company ?? null;
}

export async function insertCompany(
  db: Database,
  userId: string,
  companyData: { name: string; careersUrl: string | null },
) {
  const [inserted] = await db
    .insert(trackedCompanies)
    .values({ userId, ...companyData })
    .onConflictDoNothing({
      target: [trackedCompanies.userId, trackedCompanies.name],
    })
    .returning();
  return inserted ?? null;
}

export async function setCompanyAts(
  db: Database,
  userId: string,
  companyId: string,
  ats: { atsProvider: AtsProvider | null; atsSlug: string | null },
) {
  const [updated] = await db
    .update(trackedCompanies)
    .set({ ...ats, lastCheckedAt: new Date() })
    .where(and(eq(trackedCompanies.id, companyId), eq(trackedCompanies.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function touchCompanyChecked(db: Database, userId: string, companyId: string) {
  await db
    .update(trackedCompanies)
    .set({ lastCheckedAt: new Date() })
    .where(and(eq(trackedCompanies.id, companyId), eq(trackedCompanies.userId, userId)));
}

export async function deleteCompany(db: Database, userId: string, companyId: string) {
  const [deleted] = await db
    .delete(trackedCompanies)
    .where(and(eq(trackedCompanies.id, companyId), eq(trackedCompanies.userId, userId)))
    .returning();
  return deleted ?? null;
}
