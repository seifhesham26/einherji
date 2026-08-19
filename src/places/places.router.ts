import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import { savePlaceAsLeadSchema, searchPlacesSchema } from "./places.validators";
import { findBusinesses, savePlaceAsLead } from "./places.service";

export const placesRouter = createTRPCRouter({
  // A mutation rather than a query: it costs money per call, so it must never be
  // re-run automatically by a cache refetch.
  search: protectedProcedure
    .input(searchPlacesSchema)
    .mutation(async ({ input, ctx }) => {
      return findBusinesses(db, ctx.session.user.id, input);
    }),

  saveAsLead: protectedProcedure
    .input(savePlaceAsLeadSchema)
    .mutation(async ({ input, ctx }) => {
      return savePlaceAsLead(db, ctx.session.user.id, input);
    }),
});
