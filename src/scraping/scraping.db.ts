import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { scrapeRuns } from "@/lib/db/schema";
import type { JobSourceName, ScrapeStatus } from "./scraping.validators";

export async function insertScrapeRun(
  db: Database,
  userId: string,
  runData: { sources: JobSourceName[]; tasksTotal: number },
) {
  // Can fail on scrape_runs_one_active_per_user_idx if a second run slipped past
  // the service-level check; the caller turns that into a CONFLICT.
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

// Just the status column: polled between tasks so a cancel issued from another
// request actually stops the loop, rather than being overwritten when it finishes.
export async function getScrapeRunStatus(
  db: Database,
  runId: string,
): Promise<ScrapeStatus | null> {
  const [run] = await db
    .select({ status: scrapeRuns.status })
    .from(scrapeRuns)
    .where(eq(scrapeRuns.id, runId))
    .limit(1);
  return (run?.status as ScrapeStatus | undefined) ?? null;
}

// A run still marked "running" blocks new ones. If the process died mid-run the
// row would block them forever, so a stale one is retired instead.
export async function failStaleRun(db: Database, runId: string) {
  await db
    .update(scrapeRuns)
    .set({
      status: "failed",
      errorMessage: "Run did not finish — the server restarted or timed out.",
      finishedAt: new Date(),
    })
    .where(and(eq(scrapeRuns.id, runId), eq(scrapeRuns.status, "running")));
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

// Guarded on status: a run the user cancelled mid-flight must not be flipped back
// to "completed" when the loop it was cancelling finally unwinds.
export async function finishScrapeRunIfRunning(
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
    .where(and(eq(scrapeRuns.id, runId), eq(scrapeRuns.status, "running")))
    .returning();

  // Already terminal (cancelled, most likely) — hand back what's actually stored
  // so the caller reports the real outcome.
  if (!updated) {
    const [existing] = await db
      .select()
      .from(scrapeRuns)
      .where(eq(scrapeRuns.id, runId))
      .limit(1);
    return existing ?? null;
  }

  return updated;
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
