"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useCreateBucket() {
  const utils = trpc.useUtils();

  return trpc.buckets.create.useMutation({
    onSuccess: (bucket) => {
      utils.buckets.getAll.invalidate();
      toast.success(`Created "${bucket.name}".`);
    },
    onError: (error) => toast.error(error.message ?? "Couldn't create that bucket."),
  });
}
