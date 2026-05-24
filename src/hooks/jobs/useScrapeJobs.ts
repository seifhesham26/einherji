"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useScrapeJobs() {
  const utils = trpc.useUtils();
  return trpc.jobs.scrape.useMutation({
    onSuccess: (data) => {
      utils.jobs.getAll.invalidate();
      utils.jobs.getStats.invalidate();
      toast.success(`Scrape complete — ${data.inserted} new jobs out of ${data.total} found`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
