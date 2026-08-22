"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useCancelScrape() {
  const utils = trpc.useUtils();

  return trpc.scraping.cancel.useMutation({
    onSuccess: () => {
      utils.scraping.getLatestRun.invalidate();
      utils.jobs.getAll.invalidate();
      utils.jobs.getStats.invalidate();
      // Cancelling keeps whatever was found before the stop, so the toast says so
      // — otherwise it reads as though the work was thrown away.
      toast.info("Stopping the scrape — jobs found so far are kept.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
