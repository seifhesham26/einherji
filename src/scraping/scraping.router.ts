import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import { getRunStatusSchema, startScrapeSchema } from "./scraping.validators";
import { cancelRun, fetchLatestRun, fetchRunStatus, startScrape } from "./scraping.service";

export const scrapingRouter = createTRPCRouter({
  start: protectedProcedure
    .input(startScrapeSchema)
    .mutation(async ({ input, ctx }) => {
      return startScrape(db, ctx.session.user.id, input);
    }),

  getRunStatus: protectedProcedure
    .input(getRunStatusSchema)
    .query(async ({ input, ctx }) => {
      return fetchRunStatus(db, ctx.session.user.id, input.runId);
    }),

  getLatestRun: protectedProcedure.query(async ({ ctx }) => {
    return fetchLatestRun(db, ctx.session.user.id);
  }),

  cancel: protectedProcedure
    .input(getRunStatusSchema)
    .mutation(async ({ input, ctx }) => {
      return cancelRun(db, ctx.session.user.id, input.runId);
    }),
});
