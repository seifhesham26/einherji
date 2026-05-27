import { trpc } from "@/lib/trpc-client";

export function useGetSettings() {
  return trpc.settings.get.useQuery();
}
