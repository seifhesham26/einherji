import { createTRPCRouter } from "@/server/trpc";
import { criteriaRouter } from "@/criteria/criteria.router";
import { jobsRouter } from "@/jobs/jobs.router";
import { leadsRouter } from "@/leads/leads.router";
import { messagesRouter } from "@/messages/messages.router";

export const appRouter = createTRPCRouter({
  criteria: criteriaRouter,
  jobs: jobsRouter,
  leads: leadsRouter,
  messages: messagesRouter,
});

export type AppRouter = typeof appRouter;
