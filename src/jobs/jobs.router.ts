import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { getJobsSchema, findManagersSchema } from "./jobs.validators";
import { fetchJobs, scrapeAndSaveJobs, findAndSaveManagers } from "./jobs.service";
import { getJobsStats } from "./jobs.db";
import { db } from "@/lib/db";

export const jobsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getJobsSchema)
    .query(async ({ input, ctx }) => {
      return fetchJobs(db, ctx.session.user.id, input);
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    return getJobsStats(db, ctx.session.user.id);
  }),

  scrape: protectedProcedure.mutation(async ({ ctx }) => {
    return scrapeAndSaveJobs(db, ctx.session.user.id);
  }),

  findManagers: protectedProcedure
    .input(findManagersSchema)
    .mutation(async ({ input, ctx }) => {
      return findAndSaveManagers(db, ctx.session.user.id, input.jobId);
    }),
});
