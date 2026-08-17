"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useRemoveCompany() {
  const utils = trpc.useUtils();

  return trpc.companies.remove.useMutation({
    onSuccess: (company) => {
      utils.companies.getAll.invalidate();
      toast.success(`Removed ${company.name}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
