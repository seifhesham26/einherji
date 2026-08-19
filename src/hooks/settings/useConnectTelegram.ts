"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";

export function useConnectTelegram() {
  const utils = trpc.useUtils();

  return trpc.settings.connectTelegram.useMutation({
    onSuccess: (settings) => {
      utils.settings.get.invalidate();
      toast.success(
        settings?.hasTelegramBotToken
          ? "Telegram connected — check for the test message."
          : "Telegram disconnected.",
      );
    },
    // Telegram's own refusal is the useful part ("chat not found" means you
    // never messaged the bot), so it's shown rather than replaced.
    onError: (error) => toast.error(error.message ?? "Couldn't connect Telegram."),
  });
}
