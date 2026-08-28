"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useDeleteSavedView() {
  const utils = trpc.useUtils();

  return trpc.savedViews.remove.useMutation({
    onSuccess: () => {
      utils.savedViews.getAll.invalidate();
      toast.success("View deleted");
    },
    onError: (error) => toast.error(error.message),
  });
}
