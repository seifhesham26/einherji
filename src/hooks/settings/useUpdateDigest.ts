"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useUpdateDigest() {
  const utils = trpc.useUtils();

  return trpc.settings.updateDigest.useMutation({
    onSuccess: (settings) => {
      utils.settings.get.invalidate();
      toast.success(
        settings?.dailyDigestEnabled
          ? "Daily run on — you'll get an email each morning."
          : "Daily run off.",
      );
    },
    onError: (error) => toast.error(error.message ?? "Couldn't change that setting."),
  });
}
