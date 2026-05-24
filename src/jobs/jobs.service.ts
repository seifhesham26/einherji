import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { scrapeLinkedInJobs, findHiringManagers } from "@/lib/apify/client";
import { getActiveCriteria } from "@/criteria/criteria.db";
import { getAllJobs, getJobById, insertJobs, markJobProcessed } from "./jobs.db";
import { insertLeads } from "@/leads/leads.db";
import type { GetJobsInput } from "./jobs.validators";

export async function fetchJobs(db: Database, userId: string, input: GetJobsInput) {
  return getAllJobs(db, userId, input.processed);
}

export async function scrapeAndSaveJobs(db: Database, userId: string) {
  const activeCriteria = await getActiveCriteria(db, userId);
  if (!activeCriteria) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "No active criteria found. Set up your criteria first." });
  }

  const scraped = await scrapeLinkedInJobs({
    titles: activeCriteria.titles,
    locations: activeCriteria.locations,
    companySizeMin: activeCriteria.companySizeMin ?? undefined,
    companySizeMax: activeCriteria.companySizeMax ?? undefined,
    salaryMin: activeCriteria.salaryMin ?? undefined,
    industries: activeCriteria.industries ?? undefined,
  });

  const inserted = await insertJobs(db, userId, scraped);
  return { inserted: inserted.length, total: scraped.length };
}

export async function findAndSaveManagers(db: Database, userId: string, jobId: string) {
  const job = await getJobById(db, jobId);
  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
  }

  const profiles = await findHiringManagers(job.company, job.title, job.location ?? undefined);

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

  await markJobProcessed(db, jobId);
  return { leads: insertedLeads };
}
