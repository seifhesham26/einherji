"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useDeleteMuteRule() {
  const utils = trpc.useUtils();

  return trpc.muteRules.remove.useMutation({
    onSuccess: ({ pattern }) => {
      utils.muteRules.getAll.invalidate();
      // Jobs already dismissed by this rule stay dismissed — only future scrapes
      // change — so nothing in the list needs invalidating.
      toast.success(`Unmuted "${pattern}"`);
    },
    onError: (error) => toast.error(error.message),
  });
}
