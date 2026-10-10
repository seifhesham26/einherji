import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import { fetchQuotaStatus, fetchSharedAiQuotaStatus } from "./usage.service";
import { env } from "@/lib/env";

export const usageRouter = createTRPCRouter({
  // So the UI can show what's left before the user hits a wall mid-task.
  getQuotas: protectedProcedure.query(async ({ ctx }) => {
    return fetchQuotaStatus(db, ctx.session.user.id);
  }),
  getSharedAiCapacity: protectedProcedure.query(async () => {
    return fetchSharedAiQuotaStatus(db, env.AI_SHARED_DAILY_REQUEST_LIMIT);
  }),
});
