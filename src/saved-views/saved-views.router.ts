import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import {
  createSavedViewSchema,
  deleteSavedViewSchema,
  updateSavedViewSchema,
} from "./saved-views.validators";
import {
  createSavedView,
  editSavedView,
  fetchSavedViews,
  removeSavedView,
} from "./saved-views.service";

export const savedViewsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return fetchSavedViews(db, ctx.session.user.id);
  }),

  create: protectedProcedure
    .input(createSavedViewSchema)
    .mutation(async ({ input, ctx }) => {
      return createSavedView(db, ctx.session.user.id, input);
    }),

  update: protectedProcedure
    .input(updateSavedViewSchema)
    .mutation(async ({ input, ctx }) => {
      return editSavedView(db, ctx.session.user.id, input);
    }),

  remove: protectedProcedure
    .input(deleteSavedViewSchema)
    .mutation(async ({ input, ctx }) => {
      return removeSavedView(db, ctx.session.user.id, input);
    }),
});
