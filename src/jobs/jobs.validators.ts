import { z } from "zod";

export const getJobsSchema = z.object({
  // Narrow to one hunt. Omitted shows everything, including rows from before
  // buckets existed.
  bucketId: z.string().min(1).optional(),
  processed: z.boolean().optional(),
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

export const clearJobsSchema = z.object({
  // Scopes the clear to one hunt. Omitted clears every job on the account, which
  // is why the UI asks twice before sending it.
  bucketId: z.string().min(1).optional(),
  // Lets "tidy up what I've already dealt with" be separate from "start over".
  onlyProcessed: z.boolean().optional(),
});

export type GetJobsInput = z.infer<typeof getJobsSchema>;
export type FindManagersInput = z.infer<typeof findManagersSchema>;
export type DeleteJobsInput = z.infer<typeof deleteJobsSchema>;
export type ClearJobsInput = z.infer<typeof clearJobsSchema>;
