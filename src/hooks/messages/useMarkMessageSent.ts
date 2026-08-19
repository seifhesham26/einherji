"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useMarkMessageSent() {
  const utils = trpc.useUtils();

  return trpc.messages.markSent.useMutation({
    onSuccess: () => {
      utils.messages.getReadyToSend.invalidate();
      utils.messages.getSentTodayCount.invalidate();
      // The lead moves to message_sent at this point, so the tracker changes too.
      utils.leads.getAll.invalidate();
      utils.leads.getRecentActivity.invalidate();
      toast.success("Marked as sent.");
    },
    onError: (error) => {
      toast.error(error.message ?? "Couldn't mark that message as sent.");
    },
  });
}
