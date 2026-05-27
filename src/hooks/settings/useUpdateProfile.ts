import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";

export function useUpdateProfile() {
  const utils = trpc.useUtils();
  return trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("Profile saved.");
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to save profile.");
    },
  });
}
