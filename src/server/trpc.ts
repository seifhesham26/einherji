import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

export async function createTRPCContext({ req }: FetchCreateContextFnOptions) {
  // Wrap in try/catch so a cold-start DB timeout or auth failure returns null
  // session instead of crashing the handler and returning HTML 500 to the client
  const session = await auth.api.getSession({ headers: req.headers }).catch(() => null);
  return { session };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const trpc = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = trpc.router;

export const publicProcedure = trpc.procedure;

// Throws UNAUTHORIZED if no active session
export const protectedProcedure = trpc.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, session: ctx.session } });
});
