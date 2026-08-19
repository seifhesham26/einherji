"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useCreateLead() {
  const utils = trpc.useUtils();

  return trpc.leads.create.useMutation({
    onSuccess: (lead) => {
      utils.leads.getAll.invalidate();
      utils.leads.getRecentActivity.invalidate();
      toast.success(`Added ${lead.firstName} at ${lead.company}.`);
    },
    onError: (error) => {
      toast.error(error.message ?? "Couldn't add that lead.");
    },
  });
}
