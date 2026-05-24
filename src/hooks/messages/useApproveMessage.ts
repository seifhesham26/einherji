"use client";

import { trpc } from "@/lib/trpc-client";

export function useApproveMessage() {
  const utils = trpc.useUtils();
  return trpc.messages.approve.useMutation({
    onSuccess: () => {
      utils.messages.getAll.invalidate();
      utils.messages.getApprovedTodayCount.invalidate();
      utils.leads.getAll.invalidate();
    },
  });
}
