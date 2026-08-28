"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useCreateMuteRule() {
  const utils = trpc.useUtils();

  return trpc.muteRules.create.useMutation({
    onSuccess: ({ rule, dismissedCount }) => {
      utils.muteRules.getAll.invalidate();
      // The sweep dismisses matching jobs, so the list and every count above it
      // are now wrong.
      utils.jobs.getAll.invalidate();
      utils.jobs.getStatusCounts.invalidate();
      utils.jobs.getStats.invalidate();
      utils.buckets.getAll.invalidate();

      toast.success(
        dismissedCount > 0
          ? `Muted "${rule.pattern}" — ${dismissedCount} job${dismissedCount === 1 ? "" : "s"} dismissed`
          : `Muted "${rule.pattern}"`,
      );
    },
    onError: (error) => toast.error(error.message),
  });
}
