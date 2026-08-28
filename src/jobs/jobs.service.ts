import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { findHiringManagers } from "@/lib/apify/client";
import { getSettingsByUserId } from "@/settings/settings.db";
import {
  deleteAllJobs,
  deleteJobsByIds,
  getJobById,
  getJobEvents,
  getJobStatuses,
  getJobs,
  getOtherJobsAtCompany,
  insertJobEvents,
  moveJobsToBucket,
  setJobsStatus,
  updateJobNotes,
  type NewJobEvent,
} from "./jobs.db";
import { insertLeads } from "@/leads/leads.db";
import { consumeQuota } from "@/usage/usage.service";
import { JOB_DISMISS_REASON_LABELS, JOB_STATUS_LABELS } from "./jobs.validators";
import type {
  ClearJobsInput,
  DeleteJobsInput,
  GetJobDetailInput,
  GetJobEventsInput,
  GetJobsInput,
  MoveJobsToBucketInput,
  SetJobStatusInput,
  UpdateJobNotesInput,
} from "./jobs.validators";

// Enough to say "they're hiring for these too" without turning the detail panel
// into a second list.
const MAX_OTHER_ROLES_AT_COMPANY = 6;

export async function fetchJobs(db: Database, userId: string, input: GetJobsInput) {
  return getJobs(db, userId, input);
}

export async function fetchJobEvents(db: Database, userId: string, input: GetJobEventsInput) {
  // Scoped through the job so an id belonging to someone else returns nothing
  // rather than their history.
  const job = await getJobById(db, userId, input.jobId);
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

  return getJobEvents(db, userId, input.jobId);
}

/**
 * Moves one or more jobs along the pipeline.
 *
 * The statuses are read before the update so each event can record what the job
 * moved *from* — a history that only says where something ended up can't tell
 * you whether you applied and were rejected, or dismissed it without applying.
 *
 * Jobs already in the target status are skipped by the update itself, so a bulk
 * action over a mixed selection writes events only for what genuinely changed.
 */
export async function changeJobStatus(db: Database, userId: string, input: SetJobStatusInput) {
  const previousStatuses = await getJobStatuses(db, userId, input.jobIds);
  const updated = await setJobsStatus(
    db,
    userId,
    input.jobIds,
    input.status,
    input.dismissReason,
  );

  if (updated.length === 0) {
    return { updatedCount: 0, status: input.status };
  }

  // The reason is on the row, but the timeline is what someone reads six weeks
  // later — a history that says "dismissed" without saying why is the thing the
  // reason was added to fix.
  const body = describeChange(input);

  const events: NewJobEvent[] = updated.map((job) => ({
    userId,
    jobId: job.id,
    kind: "status_change" as const,
    fromStatus: previousStatuses.get(job.id) ?? null,
    toStatus: input.status,
    body,
  }));

  await insertJobEvents(db, events);

  return { updatedCount: updated.length, status: input.status };
}

function describeChange(input: SetJobStatusInput): string | null {
  const note = input.note && input.note.length > 0 ? input.note : null;
  if (input.status !== "dismissed" || !input.dismissReason) return note;

  const reason = JOB_DISMISS_REASON_LABELS[input.dismissReason];
  return note ? `${reason} — ${note}` : reason;
}

/**
 * Moves jobs into a different hunt.
 *
 * No event is written. A bucket is filing, not progress: recording it in the
 * timeline would bury the status history it exists to make readable.
 */
export async function refileJobs(db: Database, userId: string, input: MoveJobsToBucketInput) {
  const moved = await moveJobsToBucket(db, userId, input.jobIds, input.bucketId);
  return { movedCount: moved.length };
}

/**
 * Everything the detail panel shows, in one round trip.
 *
 * The job, its history and the company's other open roles are three queries the
 * panel would otherwise fire as three requests — and the panel opens on a key
 * press, so it opens on every j/k the user holds down.
 */
export async function fetchJobDetail(db: Database, userId: string, input: GetJobDetailInput) {
  const job = await getJobById(db, userId, input.jobId);
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

  const [events, otherRoles] = await Promise.all([
    getJobEvents(db, userId, job.id),
    getOtherJobsAtCompany(db, userId, job.company, job.id, MAX_OTHER_ROLES_AT_COMPANY),
  ]);

  return { job, events, otherRoles };
}

export async function saveJobNotes(db: Database, userId: string, input: UpdateJobNotesInput) {
  const updated = await updateJobNotes(db, userId, input.jobId, input.notes);
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });

  // Only a written note is worth an event. Clearing one is a correction, and a
  // timeline full of "note removed" is noise nobody asked for.
  if (input.notes.length > 0) {
    await insertJobEvents(db, [
      { userId, jobId: input.jobId, kind: "note", body: input.notes },
    ]);
  }

  return updated;
}

/**
 * Removes the jobs the user selected.
 *
 * Deleting a job doesn't touch the leads found from it — those are people the
 * user has already started working, and losing them because the listing was
 * tidied away would be the destructive surprise. The scraper's dedupe means a
 * deleted job can come back on the next run, which is the intended escape hatch.
 */
export async function removeJobs(db: Database, userId: string, input: DeleteJobsInput) {
  const deleted = await deleteJobsByIds(db, userId, input.jobIds);
  return { deletedCount: deleted.length };
}

export async function clearJobs(db: Database, userId: string, input: ClearJobsInput) {
  const deleted = await deleteAllJobs(db, userId, {
    bucketId: input.bucketId,
    onlyClosed: input.onlyClosed,
  });
  return { deletedCount: deleted.length };
}

/**
 * Finds hiring managers for a job via Apify.
 *
 * Still on Apify: LinkedIn profiles are auth-walled, so there's no logged-out
 * equivalent to the job endpoints the self-hosted scraper uses. See
 * docs/SCRAPER-PLAN.md Phase 4 for the replacement path.
 */
export async function findAndSaveManagers(db: Database, userId: string, jobId: string) {
  const [job, settings] = await Promise.all([
    getJobById(db, userId, jobId),
    getSettingsByUserId(db, userId),
  ]);

  if (!job) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
  }

  // Checked before the quota is charged, not inside the Apify client after it.
  // Without a token this call cannot even be attempted, and billing the account
  // for a request that was never made is the one outcome with no defence.
  if (!settings?.apifyApiToken) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "Finding hiring managers needs an Apify API token — add one in Settings → Integrations.",
    });
  }

  // The most expensive action in the app — each call runs an Apify actor over up
  // to MAX_MANAGERS_PER_JOB profiles. Charged here, after the checks that make no
  // external call, and before the work, so a retry loop can't spend for free.
  await consumeQuota(db, userId, "find_managers");

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

  // Having a contact means you're working this one. Only nudged off "new", so a
  // job you'd already moved to applied isn't dragged backwards by a lookup.
  if (job.status === "new") {
    await changeJobStatus(db, userId, {
      jobIds: [job.id],
      status: "shortlisted",
      note: `Found ${insertedLeads.length} contact${insertedLeads.length === 1 ? "" : "s"}`,
    });
  }

  return { leads: insertedLeads };
}

/** The label for a status, for messages that name one. */
export function describeJobStatus(status: keyof typeof JOB_STATUS_LABELS): string {
  return JOB_STATUS_LABELS[status];
}
