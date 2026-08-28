"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useGenerateFitReport() {
  const utils = trpc.useUtils();

  return trpc.jobInsights.generateFitReport.useMutation({
    onSuccess: () => {
      utils.jobInsights.getFitReport.invalidate();
      utils.usage.getQuotas.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
}
