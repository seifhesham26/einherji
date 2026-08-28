"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useAnalyseBacklog() {
  const utils = trpc.useUtils();

  return trpc.jobInsights.analyseBacklog.useMutation({
    onSuccess: ({ analysedCount, failedCount, remaining }) => {
      utils.jobs.getAll.invalidate();
      utils.jobs.getDetail.invalidate();
      utils.jobInsights.getBacklog.invalidate();
      utils.usage.getQuotas.invalidate();

      if (analysedCount === 0 && failedCount === 0) {
        toast.info("Nothing left to analyse");
        return;
      }

      // Failures are named rather than swallowed: a model that can't parse a
      // posting is a normal outcome, and a batch that quietly did half its work
      // is how you end up trusting a filter that isn't complete.
      const parts = [`Analysed ${analysedCount} posting${analysedCount === 1 ? "" : "s"}`];
      if (failedCount > 0) parts.push(`${failedCount} couldn't be read`);
      if (remaining > 0) parts.push(`${remaining} to go`);

      toast.success(parts.join(" · "));
    },
    onError: (error) => toast.error(error.message),
  });
}
