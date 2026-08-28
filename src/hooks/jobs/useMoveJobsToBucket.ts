"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useMoveJobsToBucket() {
  const utils = trpc.useUtils();

  return trpc.jobs.moveToBucket.useMutation({
    onSuccess: ({ movedCount }) => {
      utils.jobs.getAll.invalidate();
      utils.jobs.getStatusCounts.invalidate();
      // The bucket bar shows a job count per bucket, and this is the one action
      // that changes two of those numbers at once.
      utils.buckets.getAll.invalidate();

      toast.success(`Moved ${movedCount} job${movedCount === 1 ? "" : "s"}`);
    },
    onError: (error) => toast.error(error.message),
  });
}
