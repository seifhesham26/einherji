"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useUpdateSavedView() {
  const utils = trpc.useUtils();

  return trpc.savedViews.update.useMutation({
    onSuccess: ({ name }) => {
      utils.savedViews.getAll.invalidate();
      toast.success(`Updated "${name}"`);
    },
    onError: (error) => toast.error(error.message),
  });
}
