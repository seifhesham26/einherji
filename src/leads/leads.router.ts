import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { getLeadsSchema, updateLeadSchema } from "./leads.validators";
import { fetchLeads, patchLead, fetchRecentActivity, fetchOverdueFollowUps } from "./leads.service";
import { db } from "@/lib/db";

export const leadsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getLeadsSchema)
    .query(async ({ input, ctx }) => {
      return fetchLeads(db, ctx.session.user.id, input);
    }),

  update: protectedProcedure
    .input(updateLeadSchema)
    .mutation(async ({ input }) => {
      return patchLead(db, input);
    }),

  getRecentActivity: protectedProcedure.query(async ({ ctx }) => {
    return fetchRecentActivity(db, ctx.session.user.id);
  }),

  getOverdueFollowUps: protectedProcedure.query(async ({ ctx }) => {
    return fetchOverdueFollowUps(db, ctx.session.user.id);
  }),
});
