"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useScrapeJobs() {
  const utils = trpc.useUtils();

  return trpc.scraping.start.useMutation({
    onSuccess: (run) => {
      utils.jobs.getAll.invalidate();
      utils.jobs.getStats.invalidate();
      utils.scraping.getLatestRun.invalidate();

      if (!run) return;

      toast.success(
        run.jobsInserted > 0
          ? `Scrape complete — ${run.jobsInserted} new jobs from ${run.jobsFound} found`
          : `Scrape complete — no new jobs (${run.jobsFound} already tracked)`,
      );

      // A run that stopped at the time budget still succeeded; the user just needs
      // to know there's more waiting.
      if (run.errorMessage) toast.info(run.errorMessage);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
