import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import { updateProfileSchema, updateIntegrationsSchema } from "./settings.validators";
import { getUserSettings, updateProfile, updateIntegrations } from "./settings.service";

export const settingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    return getUserSettings(db, ctx.session.user.id);
  }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ input, ctx }) => {
      return updateProfile(db, ctx.session.user.id, input);
    }),

  updateIntegrations: protectedProcedure
    .input(updateIntegrationsSchema)
    .mutation(async ({ input, ctx }) => {
      return updateIntegrations(db, ctx.session.user.id, input);
    }),
});
