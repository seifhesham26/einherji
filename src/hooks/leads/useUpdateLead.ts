"use client";

import { trpc } from "@/lib/trpc-client";

export function useUpdateLead() {
  const utils = trpc.useUtils();
  return trpc.leads.update.useMutation({
    onSuccess: () => {
      utils.leads.getAll.invalidate();
      utils.leads.getOverdueFollowUps.invalidate();
      utils.leads.getRecentActivity.invalidate();
    },
  });
}
