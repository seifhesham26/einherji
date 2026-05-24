import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { getMessagesSchema, generateMessageSchema, approveMessageSchema } from "./messages.validators";
import { fetchMessages, generateAndSaveMessage, approveAndUpdateLead } from "./messages.service";
import { getApprovedTodayCount } from "./messages.db";
import { db } from "@/lib/db";

export const messagesRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(getMessagesSchema)
    .query(async ({ input, ctx }) => {
      return fetchMessages(db, ctx.session.user.id, input);
    }),

  getApprovedTodayCount: protectedProcedure.query(async ({ ctx }) => {
    return getApprovedTodayCount(db, ctx.session.user.id);
  }),

  generate: protectedProcedure
    .input(generateMessageSchema)
    .mutation(async ({ input, ctx }) => {
      return generateAndSaveMessage(db, ctx.session.user.id, input);
    }),

  approve: protectedProcedure
    .input(approveMessageSchema)
    .mutation(async ({ input }) => {
      return approveAndUpdateLead(db, input);
    }),
});
