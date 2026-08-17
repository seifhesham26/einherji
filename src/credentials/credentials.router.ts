import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import { deleteCredentialsSchema, saveCredentialsSchema } from "./credentials.validators";
import {
  fetchCredentialStatuses,
  removeSourceCredentials,
  saveSourceCredentials,
} from "./credentials.service";

export const credentialsRouter = createTRPCRouter({
  getStatuses: protectedProcedure.query(async ({ ctx }) => {
    return fetchCredentialStatuses(db, ctx.session.user.id);
  }),

  save: protectedProcedure
    .input(saveCredentialsSchema)
    .mutation(async ({ input, ctx }) => {
      return saveSourceCredentials(db, ctx.session.user.id, input);
    }),

  remove: protectedProcedure
    .input(deleteCredentialsSchema)
    .mutation(async ({ input, ctx }) => {
      return removeSourceCredentials(db, ctx.session.user.id, input);
    }),
});
