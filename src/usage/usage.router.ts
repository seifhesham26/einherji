import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import { fetchQuotaStatus } from "./usage.service";

export const usageRouter = createTRPCRouter({
  // So the UI can show what's left before the user hits a wall mid-task.
  getQuotas: protectedProcedure.query(async ({ ctx }) => {
    return fetchQuotaStatus(db, ctx.session.user.id);
  }),
});
