import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { jobFitReports, jobs } from "@/lib/db/schema";
import { OPEN_JOB_STATUSES } from "@/jobs/jobs.validators";
import type { FitRequirement, RemotePolicy, SeniorityLevel } from "./job-insights.validators";

// Every query takes userId first and filters on it — ownership belongs in the
// WHERE clause, not in a service check that can be forgotten.

// ─── Extracted facts ──────────────────────────────────────────────────────────

export interface JobFactsUpdate {
  seniority: SeniorityLevel;
  yearsExperienceMin: number | null;
  techStack: string[];
  salaryMinAnnual: number | null;
  salaryMaxAnnual: number | null;
  salaryCurrency: string | null;
  remotePolicy: RemotePolicy;
  offersVisaSponsorship: boolean | null;
  postingLanguage: string | null;
}

export async function saveJobFacts(
  db: Database,
  userId: string,
  jobId: string,
  facts: JobFactsUpdate,
) {
  const [updated] = await db
    .update(jobs)
    .set({ ...facts, factsExtractedAt: new Date() })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .returning({ id: jobs.id });

  return updated ?? null;
}

/**
 * The next jobs waiting to be read.
 *
 * Only live ones, and only ones with a description worth sending — an extraction
 * over an empty description spends a completion to learn nothing, and several
 * sources return no description at all. Oldest first, so a backlog drains in the
 * order it built up rather than re-reading the same top slice.
 */
export async function getJobsAwaitingExtraction(
  db: Database,
  userId: string,
  limit: number,
  bucketId?: string,
) {
  const conditions = [
    eq(jobs.userId, userId),
    isNull(jobs.factsExtractedAt),
    inArray(jobs.status, OPEN_JOB_STATUSES),
    sql`length(coalesce(${jobs.description}, '')) > 200`,
  ];

  if (bucketId) conditions.push(eq(jobs.bucketId, bucketId));

  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      location: jobs.location,
      salary: jobs.salary,
      description: jobs.description,
    })
    .from(jobs)
    .where(and(...conditions))
    .orderBy(asc(jobs.createdAt))
    .limit(limit);
}

/** How much of the backlog is left, for the button that offers to work through it. */
export async function countJobsAwaitingExtraction(
  db: Database,
  userId: string,
  bucketId?: string,
): Promise<number> {
  const conditions = [
    eq(jobs.userId, userId),
    isNull(jobs.factsExtractedAt),
    inArray(jobs.status, OPEN_JOB_STATUSES),
    sql`length(coalesce(${jobs.description}, '')) > 200`,
  ];

  if (bucketId) conditions.push(eq(jobs.bucketId, bucketId));

  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(jobs)
    .where(and(...conditions));

  return row?.total ?? 0;
}

// ─── Fit reports ──────────────────────────────────────────────────────────────

export interface StoredFitReport {
  matchPercent: number;
  summary: string;
  requirements: FitRequirement[];
  gaps: string[];
  emphasise: string[];
  model: string;
}

export async function getFitReport(db: Database, userId: string, jobId: string) {
  const [report] = await db
    .select()
    .from(jobFitReports)
    .where(and(eq(jobFitReports.userId, userId), eq(jobFitReports.jobId, jobId)))
    .limit(1);

  return report ?? null;
}

/**
 * Stores a report, replacing whatever was there.
 *
 * A fit report is a current answer rather than a history: the CV changes, the
 * model changes, and two reports on one job would only ever raise the question
 * of which is right.
 */
export async function upsertFitReport(
  db: Database,
  userId: string,
  jobId: string,
  report: StoredFitReport,
) {
  const [saved] = await db
    .insert(jobFitReports)
    .values({ userId, jobId, ...report })
    .onConflictDoUpdate({
      target: [jobFitReports.userId, jobFitReports.jobId],
      set: { ...report, createdAt: new Date() },
    })
    .returning();

  return saved;
}
