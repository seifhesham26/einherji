"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useDeleteBucket() {
  const utils = trpc.useUtils();

  return trpc.buckets.delete.useMutation({
    onSuccess: () => {
      utils.buckets.getAll.invalidate();
      // Its jobs cascade away with it, so the list has to be re-read.
      utils.jobs.getAll.invalidate();
      utils.jobs.getStats.invalidate();
      // Its contacts survive — leads.bucket_id is ON DELETE SET NULL — but they
      // move to the unfiled list, so any bucket-filtered view is now stale.
      utils.leads.getAll.invalidate();
      toast.success("Bucket deleted. Its contacts were kept.");
    },
    onError: (error) => toast.error(error.message ?? "Couldn't delete that bucket."),
  });
}
