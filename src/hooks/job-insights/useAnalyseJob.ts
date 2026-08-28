"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useAnalyseJob() {
  const utils = trpc.useUtils();

  return trpc.jobInsights.analyse.useMutation({
    onSuccess: () => {
      // The facts land on the job row, so both the panel and the list are stale —
      // and the extracted-fact filters can now match this job.
      utils.jobs.getDetail.invalidate();
      utils.jobs.getAll.invalidate();
      utils.jobInsights.getBacklog.invalidate();
      utils.usage.getQuotas.invalidate();

      toast.success("Posting analysed");
    },
    onError: (error) => toast.error(error.message),
  });
}
