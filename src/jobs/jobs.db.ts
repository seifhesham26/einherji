import { and, eq, desc, gte } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import type { ScrapedJob } from "@/lib/apify/client";

export async function getAllJobs(db: Database, userId: string, processed?: boolean) {
  const whereClause =
    processed === true
      ? and(eq(jobs.userId, userId), eq(jobs.isProcessed, true))
      : processed === false
        ? and(eq(jobs.userId, userId), eq(jobs.isProcessed, false))
        : eq(jobs.userId, userId);

  return db.select().from(jobs).where(whereClause).orderBy(desc(jobs.postedAt));
}

export async function getJobById(db: Database, jobId: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return job ?? null;
}

export async function insertJobs(db: Database, userId: string, scrapedJobs: ScrapedJob[]) {
  if (scrapedJobs.length === 0) return [];
  return db
    .insert(jobs)
    .values(
      scrapedJobs.map((job) => ({
        userId,
        apifyId: job.id,
        title: job.title,
        company: job.company,
        companySize: job.companySize,
        location: job.location,
        salary: job.salary,
        description: job.description,
        jobUrl: job.jobUrl,
        postedAt: job.postedAt ? new Date(job.postedAt) : null,
      }))
    )
    .onConflictDoNothing()
    .returning();
}

export async function markJobProcessed(db: Database, jobId: string) {
  await db.update(jobs).set({ isProcessed: true }).where(eq(jobs.id, jobId));
}

export async function getJobsStats(db: Database, userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allJobs = await db.select().from(jobs).where(eq(jobs.userId, userId));
  const scrapedToday = allJobs.filter((job) => job.createdAt && job.createdAt >= today).length;
  const managersFound = allJobs.filter((job) => job.isProcessed).length;

  return { scrapedToday, managersFound, total: allJobs.length };
}
