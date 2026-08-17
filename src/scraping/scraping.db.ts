import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { scrapeRuns } from "@/lib/db/schema";
import type { JobSourceName, ScrapeStatus } from "./scraping.validators";

export async function insertScrapeRun(
  db: Database,
  userId: string,
  runData: { sources: JobSourceName[]; tasksTotal: number },
) {
  const [inserted] = await db
    .insert(scrapeRuns)
    .values({
      userId,
      sources: runData.sources,
      tasksTotal: runData.tasksTotal,
      status: "running",
    })
    .returning();
  return inserted;
}

export async function getScrapeRunById(db: Database, userId: string, runId: string) {
  const [run] = await db
    .select()
    .from(scrapeRuns)
    .where(and(eq(scrapeRuns.id, runId), eq(scrapeRuns.userId, userId)))
    .limit(1);
  return run ?? null;
}

export async function getLatestScrapeRun(db: Database, userId: string) {
  const [run] = await db
    .select()
    .from(scrapeRuns)
    .where(eq(scrapeRuns.userId, userId))
    .orderBy(desc(scrapeRuns.startedAt))
    .limit(1);
  return run ?? null;
}

// Incremented as each source finishes so the UI can show real progress rather
// than an indeterminate spinner.
export async function recordTaskProgress(
  db: Database,
  runId: string,
  progress: { jobsFound: number; jobsInserted: number },
) {
  await db
    .update(scrapeRuns)
    .set({
      tasksCompleted: sql`${scrapeRuns.tasksCompleted} + 1`,
      jobsFound: sql`${scrapeRuns.jobsFound} + ${progress.jobsFound}`,
      jobsInserted: sql`${scrapeRuns.jobsInserted} + ${progress.jobsInserted}`,
    })
    .where(eq(scrapeRuns.id, runId));
}

export async function finishScrapeRun(
  db: Database,
  runId: string,
  outcome: { status: ScrapeStatus; errorMessage?: string | null },
) {
  const [updated] = await db
    .update(scrapeRuns)
    .set({
      status: outcome.status,
      errorMessage: outcome.errorMessage ?? null,
      finishedAt: new Date(),
    })
    .where(eq(scrapeRuns.id, runId))
    .returning();
  return updated ?? null;
}

export async function cancelScrapeRun(db: Database, userId: string, runId: string) {
  const [cancelled] = await db
    .update(scrapeRuns)
    .set({ status: "cancelled", finishedAt: new Date() })
    .where(
      and(
        eq(scrapeRuns.id, runId),
        eq(scrapeRuns.userId, userId),
        eq(scrapeRuns.status, "running"),
      ),
    )
    .returning();
  return cancelled ?? null;
}
