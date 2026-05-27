import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

export function useUpdateIntegrations() {
  const utils = trpc.useUtils();
  return trpc.settings.updateIntegrations.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("Integration settings saved.");
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to save integration settings.");
    },
  });
}
