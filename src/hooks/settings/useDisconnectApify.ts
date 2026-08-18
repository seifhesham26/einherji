import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

export function useDisconnectApify() {
  const utils = trpc.useUtils();
  return trpc.settings.disconnectApify.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("Apify token removed.");
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to remove the Apify token.");
    },
  });
}
