import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import {
  extractJobFactsSchema,
  extractManyJobFactsSchema,
  generateFitReportSchema,
  getFitReportSchema,
} from "./job-insights.validators";
import {
  analyseJob,
  analyseJobBacklog,
  fetchExtractionBacklog,
  fetchFitReport,
  judgeJobFit,
} from "./job-insights.service";

export const jobInsightsRouter = createTRPCRouter({
  // How many postings are still unread, for the button that offers to work
  // through them.
  getBacklog: protectedProcedure
    .input(z.object({ bucketId: z.string().min(1).optional() }))
    .query(async ({ input, ctx }) => {
      return fetchExtractionBacklog(db, ctx.session.user.id, input.bucketId);
    }),

  analyse: protectedProcedure
    .input(extractJobFactsSchema)
    .mutation(async ({ input, ctx }) => {
      return analyseJob(db, ctx.session.user.id, input);
    }),

  analyseBacklog: protectedProcedure
    .input(extractManyJobFactsSchema)
    .mutation(async ({ input, ctx }) => {
      return analyseJobBacklog(db, ctx.session.user.id, input);
    }),

  // A read, so the panel can show a stored report without spending anything.
  getFitReport: protectedProcedure
    .input(getFitReportSchema)
    .query(async ({ input, ctx }) => {
      return fetchFitReport(db, ctx.session.user.id, input);
    }),

  // A mutation, because it can spend a completion — even though it often just
  // returns what is already stored.
  generateFitReport: protectedProcedure
    .input(generateFitReportSchema)
    .mutation(async ({ input, ctx }) => {
      return judgeJobFit(db, ctx.session.user.id, input);
    }),
});
