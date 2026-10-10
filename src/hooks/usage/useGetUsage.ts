import { trpc } from "@/lib/trpc-client";

const refresh = { staleTime: 15_000, refetchInterval: 30_000 };

export function useGetUsage() {
  return trpc.usage.getQuotas.useQuery(undefined, refresh);
}

export function useGetSharedAiCapacity() {
  return trpc.usage.getSharedAiCapacity.useQuery(undefined, refresh);
}
