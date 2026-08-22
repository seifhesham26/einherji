"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useDeleteJobs() {
  const utils = trpc.useUtils();

  return trpc.jobs.deleteMany.useMutation({
    onSuccess: ({ deletedCount }) => {
      utils.jobs.getAll.invalidate();
      utils.jobs.getStats.invalidate();
      // Bucket counts sit in the bucket bar above the list and would otherwise
      // keep showing the pre-delete number until something else refetched them.
      utils.buckets.getAll.invalidate();
      toast.success(`Deleted ${deletedCount} job${deletedCount === 1 ? "" : "s"}`);
    },
    onError: (error) => toast.error(error.message),
  });
}
