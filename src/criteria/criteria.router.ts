import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { saveCriteriaSchema, extractFromCvSchema } from "./criteria.validators";
import { extractCv, fetchActiveCriteria, saveCriteria } from "./criteria.service";
import { db } from "@/lib/db";

export const criteriaRouter = createTRPCRouter({
  getActive: protectedProcedure.query(async ({ ctx }) => {
    return fetchActiveCriteria(db, ctx.session.user.id);
  }),

  save: protectedProcedure
    .input(saveCriteriaSchema)
    .mutation(async ({ input, ctx }) => {
      return saveCriteria(db, input, ctx.session.user.id);
    }),

  extractFromCv: protectedProcedure
    .input(extractFromCvSchema)
    .mutation(async ({ input, ctx }) => {
      return extractCv(db, ctx.session.user.id, input);
    }),
});
