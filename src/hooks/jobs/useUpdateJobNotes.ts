"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useUpdateJobNotes() {
  const utils = trpc.useUtils();

  return trpc.jobs.updateNotes.useMutation({
    onSuccess: () => {
      utils.jobs.getAll.invalidate();
      utils.jobs.getEvents.invalidate();
      toast.success("Note saved");
    },
    onError: (error) => toast.error(error.message),
  });
}
