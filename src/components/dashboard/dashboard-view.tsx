"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsOverview from "./stats-overview";
import ApprovalQueueSummary from "./approval-queue-summary";
import FollowUpReminders from "./follow-up-reminders";
import ActivityFeed from "./activity-feed";
import { useScrapeJobs } from "@/hooks/jobs/useScrapeJobs";

export default function DashboardView() {
  const scrapeJobs = useScrapeJobs();

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your daily job hunt overview</p>
        </div>
        <Button
          size="sm"
          onClick={() => scrapeJobs.mutate()}
          disabled={scrapeJobs.isPending}
          className="gap-2"
        >
          {scrapeJobs.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Run Daily Scrape
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
