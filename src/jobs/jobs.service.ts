import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { findHiringManagers } from "@/lib/apify/client";
import { getSettingsByUserId } from "@/settings/settings.db";
import { getAllJobs, getJobById, markJobProcessed } from "./jobs.db";
import { insertLeads } from "@/leads/leads.db";
import { consumeQuota } from "@/usage/usage.service";
import type { GetJobsInput } from "./jobs.validators";

export async function fetchJobs(db: Database, userId: string, input: GetJobsInput) {
  return getAllJobs(db, userId, { processed: input.processed, bucketId: input.bucketId });
}

/**
 * Finds hiring managers for a job via Apify.
 *
 * Still on Apify: LinkedIn profiles are auth-walled, so there's no logged-out
 * equivalent to the job endpoints the self-hosted scraper uses. See
 * docs/SCRAPER-PLAN.md Phase 4 for the replacement path.
 */
export async function findAndSaveManagers(db: Database, userId: string, jobId: string) {
  // The most expensive action in the app — each call runs an Apify actor over up
  // to MAX_MANAGERS_PER_JOB profiles.
  await consumeQuota(db, userId, "find_managers");

  const [job, settings] = await Promise.all([
    getJobById(db, userId, jobId),
    getSettingsByUserId(db, userId),
  ]);

  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
  }

  const profiles = await findHiringManagers(
    job.company,
    job.title,
    job.location ?? undefined,
    settings?.apifyApiToken,
  );

  const insertedLeads = await insertLeads(db, userId, profiles.map((profile) => ({
    jobId: job.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    title: profile.title,
    company: profile.company,
    linkedinUrl: profile.linkedinUrl,
    headline: profile.headline,
    about: profile.about,
  })));

  await markJobProcessed(db, userId, jobId);
  return { leads: insertedLeads };
}
