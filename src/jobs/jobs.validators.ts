import { z } from "zod";
import { jobSourceNameSchema, workTypeSchema } from "@/lib/scrapers/job-source.types";

// Mirrors jobStatusEnum in the schema, in the same order — the UI reads this to
// lay the pipeline out, so the sequence is meaningful and not alphabetical.
export const jobStatusValues = [
  "new",
  "shortlisted",
  "applying",
  "applied",
  "screening",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
  "dismissed",
] as const;

export const jobStatusSchema = z.enum(jobStatusValues);

export type JobStatus = z.infer<typeof jobStatusSchema>;

/**
 * Statuses that mean this one is over.
 *
 * Used to keep closed applications out of the default list without deleting
 * them — a rejection is information, and the analytics in a later phase are
 * counted from exactly these rows.
 */
export const TERMINAL_JOB_STATUSES: JobStatus[] = ["rejected", "ghosted", "dismissed"];

/** Everything still live, which is what the Jobs page shows unless asked otherwise. */
export const OPEN_JOB_STATUSES: JobStatus[] = jobStatusValues.filter(
  (status) => !TERMINAL_JOB_STATUSES.includes(status),
);

/** Statuses where you have actually put yourself forward. */
export const APPLIED_JOB_STATUSES: JobStatus[] = [
  "applied",
  "screening",
  "interviewing",
  "offer",
];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  new: "New",
  shortlisted: "Shortlisted",
  applying: "Applying",
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "No response",
  dismissed: "Dismissed",
};

// Mirrors jobDismissReasonEnum. A closed list rather than free text so the
// answers can be counted — "you dismiss 40% of what this source returns for
// wrong seniority" is something the matcher can eventually act on.
export const jobDismissReasonValues = [
  "wrong_seniority",
  "wrong_stack",
  "location",
  "salary",
  "company",
  "muted",
  "other",
] as const;

export const jobDismissReasonSchema = z.enum(jobDismissReasonValues);
export type JobDismissReason = z.infer<typeof jobDismissReasonSchema>;

export const JOB_DISMISS_REASON_LABELS: Record<JobDismissReason, string> = {
  wrong_seniority: "Wrong seniority",
  wrong_stack: "Wrong stack",
  location: "Location",
  salary: "Salary",
  company: "Company",
  muted: "Muted by a rule",
  other: "Something else",
};

/** The reasons offered in the UI. "muted" is written by a rule, never chosen. */
export const OFFERED_DISMISS_REASONS: JobDismissReason[] = jobDismissReasonValues.filter(
  (reason) => reason !== "muted",
);

// How the list is ordered. Score is the default because the whole point of
// storing it was to stop date order burying the good ones.
// A year is already well past the point where a posting is live; anything
// longer is the same as no filter at all.
const MAX_POSTED_WITHIN_DAYS = 365;

export const jobSortValues = ["score", "newest", "oldest"] as const;
export const jobSortSchema = z.enum(jobSortValues);
export type JobSort = z.infer<typeof jobSortSchema>;

// One screen's worth plus enough to make scrolling feel continuous. Also the
// ceiling on how much description text one response can carry.
export const JOBS_PAGE_SIZE = 30;
const MAX_JOBS_PAGE_SIZE = 100;

export const getJobsSchema = z.object({
  // Narrow to one hunt. Omitted shows everything, including rows from before
  // buckets existed.
  bucketId: z.string().min(1).optional(),

  // Omitted means "everything still live" rather than "everything", so a
  // dismissed job stays dismissed without having to be deleted.
  statuses: z.array(jobStatusSchema).min(1).optional(),
  sources: z.array(jobSourceNameSchema).min(1).optional(),
  workTypes: z.array(workTypeSchema).min(1).optional(),
  isRemote: z.boolean().optional(),
  minScore: z.number().int().min(0).max(100).optional(),
  // Relative, not an absolute date. A saved view holding "posted after 21 Aug"
  // means something different every morning, and "this week" is the question
  // people actually ask.
  postedWithinDays: z.number().int().min(1).max(MAX_POSTED_WITHIN_DAYS).optional(),
  // Matched against title and company. Trimmed here so a search of spaces
  // doesn't become a LIKE '%   %' that matches nothing.
  search: z.string().trim().max(200).optional(),

  sort: jobSortSchema.default("score"),
  limit: z.number().int().min(1).max(MAX_JOBS_PAGE_SIZE).default(JOBS_PAGE_SIZE),
  // Keyset rather than an offset: new jobs arrive at the top of exactly this
  // ordering, and an offset would then shift every later page by one and show
  // the same row twice.
  cursor: z.string().min(1).optional(),
});

export const findManagersSchema = z.object({
  jobId: z.string().min(1),
});

// Capped because the ids travel in the request body and an unbounded list is a
// cheap way to make one request delete a whole table.
const MAX_JOBS_PER_DELETE = 500;

export const deleteJobsSchema = z.object({
  jobIds: z.array(z.string().min(1)).min(1).max(MAX_JOBS_PER_DELETE),
});

// Bulk by design: triage is done in batches, and one request that moves twelve
// jobs is better than twelve that each move one.
export const setJobStatusSchema = z.object({
  jobIds: z.array(z.string().min(1)).min(1).max(MAX_JOBS_PER_DELETE),
  status: jobStatusSchema,
  // Only meaningful alongside status: "dismissed". Stored on the row and cleared
  // when the job is reopened, so a job's reason always describes its current
  // state rather than the last time it was dropped.
  dismissReason: jobDismissReasonSchema.optional(),
  // Optional context recorded against the change — why it was dismissed, which
  // portal it was applied through.
  note: z.string().trim().max(2000).optional(),
});

// Refiling a batch into another hunt. Null moves them out of every bucket, back
// to the unfiled pool the "All" view shows.
export const moveJobsToBucketSchema = z.object({
  jobIds: z.array(z.string().min(1)).min(1).max(MAX_JOBS_PER_DELETE),
  bucketId: z.string().min(1).nullable(),
});

export const updateJobNotesSchema = z.object({
  jobId: z.string().min(1),
  notes: z.string().trim().max(5000),
});

export const getJobEventsSchema = z.object({
  jobId: z.string().min(1),
});

export const getJobDetailSchema = z.object({
  jobId: z.string().min(1),
});

export const clearJobsSchema = z.object({
  // Scopes the clear to one hunt. Omitted clears every job on the account, which
  // is why the UI asks twice before sending it.
  bucketId: z.string().min(1).optional(),
  // Lets "tidy up what I've finished with" be separate from "start over".
  // Renamed from onlyProcessed: it now means the closed statuses rather than
  // "we ran a hiring-manager lookup on it".
  onlyClosed: z.boolean().optional(),
});

export type GetJobsInput = z.infer<typeof getJobsSchema>;
export type FindManagersInput = z.infer<typeof findManagersSchema>;
export type DeleteJobsInput = z.infer<typeof deleteJobsSchema>;
export type SetJobStatusInput = z.infer<typeof setJobStatusSchema>;
export type MoveJobsToBucketInput = z.infer<typeof moveJobsToBucketSchema>;
export type UpdateJobNotesInput = z.infer<typeof updateJobNotesSchema>;
export type GetJobEventsInput = z.infer<typeof getJobEventsSchema>;
export type GetJobDetailInput = z.infer<typeof getJobDetailSchema>;
export type ClearJobsInput = z.infer<typeof clearJobsSchema>;
