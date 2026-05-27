"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import StatsOverview from "./stats-overview";
import ApprovalQueueSummary from "./approval-queue-summary";
import FollowUpReminders from "./follow-up-reminders";
import ActivityFeed from "./activity-feed";
import { useScrapeJobs } from "@/hooks/jobs/useScrapeJobs";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardView() {
  const scrapeJobs = useScrapeJobs();
  const { data: session } = useSession();

  const firstName = session?.user.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here's your job hunt overview.</p>
        </div>
        <Button
          size="sm"
          onClick={() => scrapeJobs.mutate()}
          disabled={scrapeJobs.isPending}
          className="gap-2 shrink-0"
        >
          {scrapeJobs.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {scrapeJobs.isPending ? "Scraping…" : "Run Daily Scrape"}
        </Button>
      </div>

      {/* Stats row */}
      <StatsOverview />

      {/* Two-column layout */}
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
