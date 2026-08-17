"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useUpdateJobSources() {
  const utils = trpc.useUtils();

  return trpc.settings.updateJobSources.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("Job sources updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
