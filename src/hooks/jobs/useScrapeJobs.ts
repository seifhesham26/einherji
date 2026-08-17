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

      // A cancelled run also resolves successfully — the mutation did what was
      // asked. Reporting it as "complete" would be a lie.
      if (run.status === "cancelled") {
        toast.info(`Scrape cancelled — kept the ${run.jobsInserted} jobs found so far`);
        return;
      }

      toast.success(
        run.jobsInserted > 0
          ? `Scrape complete — ${run.jobsInserted} new jobs from ${run.jobsFound} found`
          : `Scrape complete — no new jobs (${run.jobsFound} already tracked)`,
      );

      // Covers both the time budget and any source that failed. Neither sinks the
      // run, but silently dropping the reason is how a broken adapter stays hidden.
      if (run.errorMessage) toast.warning(run.errorMessage);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
