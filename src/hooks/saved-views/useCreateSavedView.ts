"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useCreateSavedView() {
  const utils = trpc.useUtils();

  return trpc.savedViews.create.useMutation({
    onSuccess: ({ name }) => {
      utils.savedViews.getAll.invalidate();
      toast.success(`Saved "${name}"`);
    },
    onError: (error) => toast.error(error.message),
  });
}
