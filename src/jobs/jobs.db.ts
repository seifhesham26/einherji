import { and, count, eq, desc, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { dedupeBySourceJobId, type ScrapedJob } from "@/lib/scrapers/job-source.types";

export async function getAllJobs(db: Database, userId: string, processed?: boolean) {
  const whereClause =
    processed === undefined
      ? eq(jobs.userId, userId)
      : and(eq(jobs.userId, userId), eq(jobs.isProcessed, processed));

  return db.select().from(jobs).where(whereClause).orderBy(desc(jobs.postedAt));
}

export async function getJobById(db: Database, userId: string, jobId: string) {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .limit(1);
  return job ?? null;
}

// Loaded once per run so sources can skip the expensive detail fetch for jobs we
// already hold. Only the id column crosses the wire.
//
// Scoped to one source on purpose: ids are only unique within a source, and
// Greenhouse and LinkedIn both use bare numeric ids. Matching across sources
// would make a LinkedIn job vanish because some unrelated Greenhouse posting
// happened to share its number.
export async function getExistingSourceJobIds(
  db: Database,
  userId: string,
  source: ScrapedJob["source"],
): Promise<Set<string>> {
  const rows = await db
    .select({ sourceJobId: jobs.sourceJobId })
    .from(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.source, source)));
  return new Set(rows.map((row) => row.sourceJobId));
}

export async function insertJobs(db: Database, userId: string, scrapedJobs: ScrapedJob[]) {
  // Belt and braces: sources dedupe their own output, but a duplicate reaching
  // the insert would make the returned count — and so the run's stats — wrong.
  const uniqueJobs = dedupeBySourceJobId(scrapedJobs);
  if (uniqueJobs.length === 0) return [];

  return db
    .insert(jobs)
    .values(
      uniqueJobs.map((job) => ({
        userId,
        source: job.source,
        sourceJobId: job.sourceJobId,
        title: job.title,
        company: job.company,
        companyUrl: job.companyUrl,
        location: job.location,
        salary: job.salary,
        description: job.description,
        jobUrl: job.jobUrl,
        postedAt: job.postedAt,
        workType: job.workType,
        isRemote: job.isRemote,
        tags: job.tags,
        attributionText: job.attributionText,
        attributionUrl: job.attributionUrl,
      })),
    )
    // Backed by the (userId, source, sourceJobId) unique index. sourceJobId is
    // NOT NULL, so this actually fires — a nullable column would make every row
    // distinct and silently duplicate the whole scrape.
    .onConflictDoNothing({
      target: [jobs.userId, jobs.source, jobs.sourceJobId],
    })
    .returning();
}

// Clears a user's jobs from one source — used when they turn a source off, and to
// force a re-pull after a parser fix (dedupe means existing rows are never
// rewritten, so stale data has to be removed rather than updated).
export async function deleteJobsBySource(
  db: Database,
  userId: string,
  source: ScrapedJob["source"],
) {
  return db
    .delete(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.source, source)))
    .returning({ id: jobs.id });
}

export async function markJobProcessed(db: Database, userId: string, jobId: string) {
  await db
    .update(jobs)
    .set({ isProcessed: true })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)));
}

export async function getJobsStats(db: Database, userId: string) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // Counted in SQL rather than by pulling every row — job descriptions are large
  // and there's no reason to ship them across the wire to compute three numbers.
  const [stats] = await db
    .select({
      total: count(),
      scrapedToday: count(sql`CASE WHEN ${jobs.createdAt} >= ${startOfToday} THEN 1 END`),
      processed: count(sql`CASE WHEN ${jobs.isProcessed} THEN 1 END`),
    })
    .from(jobs)
    .where(eq(jobs.userId, userId));

  return {
    total: stats?.total ?? 0,
    scrapedToday: stats?.scrapedToday ?? 0,
    processed: stats?.processed ?? 0,
  };
}
