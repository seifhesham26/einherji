"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useDeleteJobDocument() {
  const utils = trpc.useUtils();

  return trpc.jobDocuments.remove.useMutation({
    onSuccess: () => {
      utils.jobDocuments.getForJob.invalidate();
      toast.success("Deleted");
    },
    onError: (error) => toast.error(error.message),
  });
}
