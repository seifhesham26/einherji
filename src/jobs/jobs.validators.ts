import { z } from "zod";

export const getJobsSchema = z.object({
  processed: z.boolean().optional(),
});

export const findManagersSchema = z.object({
  jobId: z.string().min(1),
});

export type GetJobsInput = z.infer<typeof getJobsSchema>;
export type FindManagersInput = z.infer<typeof findManagersSchema>;
