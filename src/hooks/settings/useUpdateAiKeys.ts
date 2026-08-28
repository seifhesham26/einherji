"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useUpdateAiKeys() {
  const utils = trpc.useUtils();

  return trpc.settings.updateAiKeys.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("AI keys saved");
    },
    onError: (error) => toast.error(error.message),
  });
}
