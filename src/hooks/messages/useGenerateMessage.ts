"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useGenerateMessage() {
  const utils = trpc.useUtils();
  return trpc.messages.generate.useMutation({
    onSuccess: () => {
      utils.messages.getAll.invalidate();
      toast.success("Message generated");
    },
    onError: (error) => {
      toast.error("Failed to generate: " + error.message);
    },
  });
}
