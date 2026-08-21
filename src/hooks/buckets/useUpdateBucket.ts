"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useUpdateBucket() {
  const utils = trpc.useUtils();

  return trpc.buckets.update.useMutation({
    onSuccess: (bucket) => {
      utils.buckets.getAll.invalidate();
      toast.success(`Saved "${bucket.name}".`);
    },
    onError: (error) => toast.error(error.message ?? "Couldn't save that bucket."),
  });
}
