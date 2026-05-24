import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { saveCriteriaSchema, extractFromCvSchema } from "./criteria.validators";
import { fetchActiveCriteria, saveCriteria } from "./criteria.service";
import { extractCvFromPdf } from "@/lib/cv-parser";
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
    .mutation(async ({ input }) => {
      return extractCvFromPdf(input.pdfBase64);
    }),
});
