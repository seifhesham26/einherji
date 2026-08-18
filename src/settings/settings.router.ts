import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import {
  updateProfileSchema,
  updateIntegrationsSchema,
  updateJobSourcesSchema,
} from "./settings.validators";
import {
  disconnectApify,
  getUserSettings,
  updateProfile,
  updateIntegrations,
  updateJobSources,
} from "./settings.service";

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

  disconnectApify: protectedProcedure.mutation(async ({ ctx }) => {
    return disconnectApify(db, ctx.session.user.id);
  }),

  updateJobSources: protectedProcedure
    .input(updateJobSourcesSchema)
    .mutation(async ({ input, ctx }) => {
      return updateJobSources(db, ctx.session.user.id, input);
    }),
});
