"use client";

import { trpc } from "@/lib/trpc-client";
import type { MessageStatus } from "@/messages/messages.validators";

export function useGetMessages(status: MessageStatus = "draft") {
  return trpc.messages.getAll.useQuery({ status });
}
