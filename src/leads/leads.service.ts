import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import {
  findDuplicateLead,
  getAllLeads,
  getRecentLeadActivity,
  getOverdueFollowUps,
  insertLead,
  updateLead,
} from "./leads.db";
import type {
  CreateLeadInput,
  CreateLeadsInput,
  GetLeadsInput,
  UpdateLeadInput,
} from "./leads.validators";

export async function fetchLeads(db: Database, userId: string, input: GetLeadsInput) {
  return getAllLeads(db, userId, input.status);
}

/**
 * Adds a contact by hand.
 *
 * This is the working path to a lead: automated hiring-manager discovery needs a
 * logged-in LinkedIn session, which this app deliberately doesn't use. Everything
 * downstream — message generation, approval, send tracking — works the same
 * whether a lead was scraped or typed in.
 */
export async function createLead(db: Database, userId: string, leadData: CreateLeadInput) {
  // The form submits untouched optional fields as "". Stored as-is that becomes a
  // second way to say "not provided", which every reader then has to handle.
  const blankToNull = (value?: string) => (value?.trim() ? value.trim() : null);

  const normalised = {
    firstName: leadData.firstName.trim(),
    company: leadData.company.trim(),
    lastName: blankToNull(leadData.lastName),
    title: blankToNull(leadData.title),
    linkedinUrl: blankToNull(leadData.linkedinUrl),
    headline: blankToNull(leadData.headline),
    about: blankToNull(leadData.about),
    phone: blankToNull(leadData.phone),
    placeId: blankToNull(leadData.placeId),
    ...(leadData.jobId ? { jobId: leadData.jobId } : {}),
    ...(leadData.bucketId ? { bucketId: leadData.bucketId } : {}),
  };

  const duplicate = await findDuplicateLead(db, userId, {
    linkedinUrl: normalised.linkedinUrl,
    firstName: normalised.firstName,
    company: normalised.company,
  });

  if (duplicate) {
    throw new TRPCError({
      code: "CONFLICT",
      message: `${duplicate.firstName} at ${duplicate.company} is already in your leads.`,
    });
  }

  return insertLead(db, userId, normalised);
}

/**
 * Imports a pasted list.
 *
 * Every row is attempted independently. A list copied off a map will always
 * contain a few duplicates and a few oddities, and rejecting the whole paste for
 * one bad row would be useless — so the result says what happened to each.
 */
export async function createLeads(db: Database, userId: string, input: CreateLeadsInput) {
  let created = 0;
  const duplicates: string[] = [];
  const failed: { name: string; reason: string }[] = [];

  for (const entry of input.leads) {
    try {
      await createLead(db, userId, {
        // A business has no first name, and firstName is NOT NULL on leads.
        firstName: entry.name,
        company: entry.name,
        phone: entry.phone,
        about: entry.notes,
        bucketId: input.bucketId,
      });
      created += 1;
    } catch (error) {
      // A duplicate is the expected outcome for a re-import, not a failure.
      if (error instanceof TRPCError && error.code === "CONFLICT") {
        duplicates.push(entry.name);
        continue;
      }
      failed.push({
        name: entry.name,
        reason: error instanceof Error ? error.message : "could not be saved",
      });
    }
  }

  return { created, duplicates, failed };
}

export async function patchLead(db: Database, userId: string, updateData: UpdateLeadInput) {
  const updated = await updateLead(db, userId, updateData);
  // Now that the update is scoped, "no rows changed" means the lead either
  // doesn't exist or belongs to someone else. Both answer the same way, so the
  // response can't be used to probe for other people's lead ids.
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
  return updated;
}

export async function fetchRecentActivity(db: Database, userId: string) {
  return getRecentLeadActivity(db, userId);
}

export async function fetchOverdueFollowUps(db: Database, userId: string) {
  return getOverdueFollowUps(db, userId);
}
