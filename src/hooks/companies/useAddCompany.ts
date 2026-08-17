"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useAddCompany() {
  const utils = trpc.useUtils();

  return trpc.companies.add.useMutation({
    onSuccess: (company) => {
      utils.companies.getAll.invalidate();

      // Detection is best-effort, so tell the user which outcome they got —
      // an unresolved company won't be scraped until they fix it.
      if (company.atsProvider) {
        toast.success(`Added ${company.name} — found their ${company.atsProvider} board`);
      } else {
        toast.warning(
          `Added ${company.name}, but we couldn't find their job board. Add their careers page URL and retry.`,
        );
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
