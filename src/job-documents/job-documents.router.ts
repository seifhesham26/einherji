import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import {
  deleteJobDocumentSchema,
  generateJobDocumentSchema,
  getJobDocumentsSchema,
} from "./job-documents.validators";
import {
  fetchJobDocuments,
  generateJobDocument,
  removeJobDocument,
} from "./job-documents.service";

export const jobDocumentsRouter = createTRPCRouter({
  getForJob: protectedProcedure
    .input(getJobDocumentsSchema)
    .query(async ({ input, ctx }) => {
      return fetchJobDocuments(db, ctx.session.user.id, input);
    }),

  generate: protectedProcedure
    .input(generateJobDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      return generateJobDocument(db, ctx.session.user.id, input);
    }),

  remove: protectedProcedure
    .input(deleteJobDocumentSchema)
    .mutation(async ({ input, ctx }) => {
      return removeJobDocument(db, ctx.session.user.id, input);
    }),
});
