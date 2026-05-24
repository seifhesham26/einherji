"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useSaveCriteria() {
  const utils = trpc.useUtils();
  return trpc.criteria.save.useMutation({
    onSuccess: () => {
      utils.criteria.getActive.invalidate();
      toast.success("Criteria saved");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
