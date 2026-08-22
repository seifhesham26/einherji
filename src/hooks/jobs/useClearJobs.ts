"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useClearJobs() {
  const utils = trpc.useUtils();

  return trpc.jobs.clear.useMutation({
    onSuccess: ({ deletedCount }) => {
      utils.jobs.getAll.invalidate();
      utils.jobs.getStats.invalidate();
      utils.buckets.getAll.invalidate();

      toast.success(
        deletedCount === 0
          ? "Nothing to clear"
          : `Cleared ${deletedCount} job${deletedCount === 1 ? "" : "s"}`,
      );
    },
    onError: (error) => toast.error(error.message),
  });
}
