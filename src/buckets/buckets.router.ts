import { createTRPCRouter, protectedProcedure } from "@/server/trpc";
import { db } from "@/lib/db";
import {
  bucketIdSchema,
  createBucketSchema,
  updateBucketSchema,
} from "./buckets.validators";
import { createBucket, editBucket, fetchBuckets, removeBucket } from "./buckets.service";

export const bucketsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return fetchBuckets(db, ctx.session.user.id);
  }),

  create: protectedProcedure
    .input(createBucketSchema)
    .mutation(async ({ input, ctx }) => {
      return createBucket(db, ctx.session.user.id, input);
    }),

  update: protectedProcedure
    .input(updateBucketSchema)
    .mutation(async ({ input, ctx }) => {
      return editBucket(db, ctx.session.user.id, input);
    }),

  delete: protectedProcedure
    .input(bucketIdSchema)
    .mutation(async ({ input, ctx }) => {
      return removeBucket(db, ctx.session.user.id, input.id);
    }),
});
