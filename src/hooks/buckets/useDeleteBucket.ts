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
      toast.success("Bucket deleted.");
    },
    onError: (error) => toast.error(error.message ?? "Couldn't delete that bucket."),
  });
}
