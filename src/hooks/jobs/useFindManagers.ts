"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useFindManagers() {
  const utils = trpc.useUtils();
  return trpc.jobs.findManagers.useMutation({
    onSuccess: (data) => {
      utils.jobs.getAll.invalidate();
      utils.leads.getAll.invalidate();
      utils.jobs.getStats.invalidate();
      toast.success(`Found ${data.leads.length} hiring manager${data.leads.length !== 1 ? "s" : ""}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
