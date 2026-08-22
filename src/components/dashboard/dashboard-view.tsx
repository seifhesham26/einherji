"use client";

import StatsOverview from "./stats-overview";
import ApprovalQueueSummary from "./approval-queue-summary";
import FollowUpReminders from "./follow-up-reminders";
import ActivityFeed from "./activity-feed";
import ScrapeButton from "@/components/scraping/scrape-button";
import ScrapeRunPanel from "@/components/scraping/scrape-run-panel";
import { useScrapeJobs } from "@/hooks/jobs/useScrapeJobs";
import { useIsHydrated } from "@/hooks/useIsHydrated";
import { useSession } from "@/lib/auth-client";

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardView() {
  const scrapeJobs = useScrapeJobs();
  const { data: session } = useSession();

  // The server renders this too, and its clock is UTC. Reading the hour during
  // render made the server say "Good evening" and the browser "Good afternoon"
  // — a hydration mismatch React logs and then patches over. Held back until
  // hydration, where the only clock that matters is the user's.
  const isHydrated = useIsHydrated();
  const greeting = isHydrated ? getGreeting(new Date().getHours()) : null;

  const firstName = session?.user.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">
            {/* Non-breaking space holds the line's height before the greeting
                resolves, so the page doesn't shift a row on mount. */}
            {greeting ? `${greeting}${firstName ? `, ${firstName}` : ""}` : " "}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here&apos;s your job hunt overview.</p>
        </div>
        <ScrapeButton scrape={scrapeJobs} label="Run daily scrape" />
      </div>

      <ScrapeRunPanel isStarting={scrapeJobs.isPending} />

      <StatsOverview />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <ApprovalQueueSummary />
          <FollowUpReminders />
        </div>
        <ActivityFeed />
      </div>
    </div>
  );
}
