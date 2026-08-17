"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useResolveCompanyAts() {
  const utils = trpc.useUtils();

  return trpc.companies.resolveAts.useMutation({
    onSuccess: (company) => {
      utils.companies.getAll.invalidate();
      if (company) toast.success(`Found ${company.name}'s ${company.atsProvider} board`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
