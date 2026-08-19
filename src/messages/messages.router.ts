import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import {
  getMessagesSchema,
  generateMessageSchema,
  approveMessageSchema,
  markMessageSentSchema,
} from "./messages.validators";
import {
  fetchMessages,
  fetchReadyToSend,
  generateAndSaveMessage,
  approveAndUpdateLead,
  markMessageAsSent,
} from "./messages.service";
import { getApprovedTodayCount, getSentTodayCount } from "./messages.db";
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

  getReadyToSend: protectedProcedure.query(async ({ ctx }) => {
    return fetchReadyToSend(db, ctx.session.user.id);
  }),

  getSentTodayCount: protectedProcedure.query(async ({ ctx }) => {
    return getSentTodayCount(db, ctx.session.user.id);
  }),

  markSent: protectedProcedure
    .input(markMessageSentSchema)
    .mutation(async ({ input, ctx }) => {
      return markMessageAsSent(db, ctx.session.user.id, input);
    }),

  generate: protectedProcedure
    .input(generateMessageSchema)
    .mutation(async ({ input, ctx }) => {
      return generateAndSaveMessage(db, ctx.session.user.id, input);
    }),

  approve: protectedProcedure
    .input(approveMessageSchema)
    .mutation(async ({ input, ctx }) => {
      return approveAndUpdateLead(db, ctx.session.user.id, input);
    }),
});
