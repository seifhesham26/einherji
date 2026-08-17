import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import {
  addCompanySchema,
  deleteCompanySchema,
  resolveCompanySchema,
  updateCompanySchema,
} from "./companies.validators";
import {
  addTrackedCompany,
  fetchTrackedCompanies,
  removeTrackedCompany,
  resolveCompanyAts,
  updateTrackedCompany,
} from "./companies.service";

export const companiesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return fetchTrackedCompanies(db, ctx.session.user.id);
  }),

  add: protectedProcedure
    .input(addCompanySchema)
    .mutation(async ({ input, ctx }) => {
      return addTrackedCompany(db, ctx.session.user.id, input);
    }),

  resolveAts: protectedProcedure
    .input(resolveCompanySchema)
    .mutation(async ({ input, ctx }) => {
      return resolveCompanyAts(db, ctx.session.user.id, input.id);
    }),

  update: protectedProcedure
    .input(updateCompanySchema)
    .mutation(async ({ input, ctx }) => {
      return updateTrackedCompany(db, ctx.session.user.id, input);
    }),

  remove: protectedProcedure
    .input(deleteCompanySchema)
    .mutation(async ({ input, ctx }) => {
      return removeTrackedCompany(db, ctx.session.user.id, input);
    }),
});
