"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useSaveCredentials() {
  const utils = trpc.useUtils();

  return trpc.credentials.save.useMutation({
    onSuccess: () => {
      utils.credentials.getStatuses.invalidate();
      toast.success("Credentials saved — this source is now active");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveCredentials() {
  const utils = trpc.useUtils();

  return trpc.credentials.remove.useMutation({
    onSuccess: () => {
      utils.credentials.getStatuses.invalidate();
      toast.success("Credentials removed");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
