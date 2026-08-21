import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/root";
import { createTRPCContext } from "@/server/trpc";

// scraping.start runs the whole scrape inside this request, against a 60s budget
// of its own (MAX_RUN_DURATION_MS). Without this the route inherits the platform
// default, which is well below that on Hobby — the function is killed mid-run,
// and the row it left behind stays "running" and blocks the next scrape until the
// stale-run sweep retires it five minutes later.
export const maxDuration = 300;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
