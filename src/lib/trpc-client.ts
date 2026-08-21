import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/root";

export const trpc = createTRPCReact<AppRouter>();

/**
 * What each procedure actually hands back.
 *
 * Components that render a procedure's result should read its type from here
 * rather than from the Drizzle table — a query that adds a computed column, as
 * buckets.getAll does with its job and lead counts, returns a shape the table
 * type doesn't describe.
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;
