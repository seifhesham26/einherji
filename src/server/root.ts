import { createTRPCRouter } from "@/server/trpc";
import { companiesRouter } from "@/companies/companies.router";
import { credentialsRouter } from "@/credentials/credentials.router";
import { criteriaRouter } from "@/criteria/criteria.router";
import { jobsRouter } from "@/jobs/jobs.router";
import { leadsRouter } from "@/leads/leads.router";
import { messagesRouter } from "@/messages/messages.router";
import { scrapingRouter } from "@/scraping/scraping.router";
import { settingsRouter } from "@/settings/settings.router";
import { usageRouter } from "@/usage/usage.router";

export const appRouter = createTRPCRouter({
  companies: companiesRouter,
  credentials: credentialsRouter,
  criteria: criteriaRouter,
  jobs: jobsRouter,
  leads: leadsRouter,
  messages: messagesRouter,
  scraping: scrapingRouter,
  settings: settingsRouter,
  usage: usageRouter,
});

export type AppRouter = typeof appRouter;
