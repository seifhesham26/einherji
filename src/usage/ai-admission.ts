import type { Database } from "@/lib/db";
import { resolveAiFundingSource, type AiCredentials } from "@/lib/ai/resolve-ai-client";
import { TRPCError } from "@trpc/server";
import { isAccountVerified } from "./usage.db";
import type { UsageAction } from "./usage.validators";
import { consumeQuota } from "./usage.service";
import { env } from "@/lib/env";

export async function admitAiAction(db: Database, userId: string, action: UsageAction, model: string, credentials: AiCredentials) {
  if (resolveAiFundingSource(model, credentials) === "platform" && await isAccountVerified(db, userId) !== true) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Verify your email before using platform-funded AI." });
  }
  await consumeQuota(db, userId, action, { sharedAiLimit: env.AI_SHARED_DAILY_REQUEST_LIMIT });
}
