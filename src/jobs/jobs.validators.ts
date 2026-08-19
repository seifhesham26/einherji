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

export type GetJobsInput = z.infer<typeof getJobsSchema>;
export type FindManagersInput = z.infer<typeof findManagersSchema>;
