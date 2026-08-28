import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import {
  clearJobsSchema,
  deleteJobsSchema,
  findManagersSchema,
  getJobDetailSchema,
  getJobEventsSchema,
  getJobsSchema,
  moveJobsToBucketSchema,
  setJobStatusSchema,
  updateJobNotesSchema,
} from "./jobs.validators";
import {
  changeJobStatus,
  clearJobs,
  fetchJobDetail,
  fetchJobEvents,
  fetchJobs,
  findAndSaveManagers,
  refileJobs,
  removeJobs,
  saveJobNotes,
} from "./jobs.service";
import { getJobStatusCounts, getJobsStats } from "./jobs.db";
import { db } from "@/lib/db";
import { z } from "zod";

export const jobsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getJobsSchema)
    .query(async ({ input, ctx }) => {
      return fetchJobs(db, ctx.session.user.id, input);
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    return getJobsStats(db, ctx.session.user.id);
  }),

  // Drives the filter chips above the list. Separate from getAll because the
  // counts must not change as the user narrows the list — they're what tells you
  // what narrowing would do.
  getStatusCounts: protectedProcedure
    .input(z.object({ bucketId: z.string().min(1).optional() }))
    .query(async ({ input, ctx }) => {
      return getJobStatusCounts(db, ctx.session.user.id, input.bucketId);
    }),

  // The detail panel's single request: the job, its history and the company's
  // other open roles. Three procedures would be three round trips on a panel
  // that opens on a key press.
  getDetail: protectedProcedure
    .input(getJobDetailSchema)
    .query(async ({ input, ctx }) => {
      return fetchJobDetail(db, ctx.session.user.id, input);
    }),

  getEvents: protectedProcedure
    .input(getJobEventsSchema)
    .query(async ({ input, ctx }) => {
      return fetchJobEvents(db, ctx.session.user.id, input);
    }),

  // Scraping moved to the scraping router, which tracks runs and supports
  // multiple sources. See scraping.start.

  setStatus: protectedProcedure
    .input(setJobStatusSchema)
    .mutation(async ({ input, ctx }) => {
      return changeJobStatus(db, ctx.session.user.id, input);
    }),

  moveToBucket: protectedProcedure
    .input(moveJobsToBucketSchema)
    .mutation(async ({ input, ctx }) => {
      return refileJobs(db, ctx.session.user.id, input);
    }),

  updateNotes: protectedProcedure
    .input(updateJobNotesSchema)
    .mutation(async ({ input, ctx }) => {
      return saveJobNotes(db, ctx.session.user.id, input);
    }),

  findManagers: protectedProcedure
    .input(findManagersSchema)
    .mutation(async ({ input, ctx }) => {
      return findAndSaveManagers(db, ctx.session.user.id, input.jobId);
    }),

  deleteMany: protectedProcedure
    .input(deleteJobsSchema)
    .mutation(async ({ input, ctx }) => {
      return removeJobs(db, ctx.session.user.id, input);
    }),

  clear: protectedProcedure
    .input(clearJobsSchema)
    .mutation(async ({ input, ctx }) => {
      return clearJobs(db, ctx.session.user.id, input);
    }),
});
