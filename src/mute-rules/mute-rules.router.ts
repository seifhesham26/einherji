import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import { createMuteRuleSchema, deleteMuteRuleSchema } from "./mute-rules.validators";
import { createMuteRule, fetchMuteRules, removeMuteRule } from "./mute-rules.service";

export const muteRulesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return fetchMuteRules(db, ctx.session.user.id);
  }),

  create: protectedProcedure
    .input(createMuteRuleSchema)
    .mutation(async ({ input, ctx }) => {
      return createMuteRule(db, ctx.session.user.id, input);
    }),

  remove: protectedProcedure
    .input(deleteMuteRuleSchema)
    .mutation(async ({ input, ctx }) => {
      return removeMuteRule(db, ctx.session.user.id, input);
    }),
});
