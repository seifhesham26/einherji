import type OpenAI from "openai";
import { TRPCError } from "@trpc/server";

export async function createCompletion(client: OpenAI, input: OpenAI.ChatCompletionCreateParams) {
  if (!input.model.trim() || input.model.length > 200 ||
    typeof input.max_tokens !== "number" || !Number.isSafeInteger(input.max_tokens) ||
    input.max_tokens < 1 || input.max_tokens > 1600 || input.stream ||
    (input.n != null && input.n !== 1) || input.max_completion_tokens != null ||
    input.messages.length === 0 || input.messages.some((message) => typeof message.content !== "string")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This AI request exceeds the supported text or output limits." });
  }

  const bytes = input.messages.reduce((total, message) => total + Buffer.byteLength(message.content as string, "utf8"), 0);
  if (bytes > 64_000) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This AI request is too large. Shorten the profile, notes or application question." });
  }

  return client.chat.completions.create(input as OpenAI.ChatCompletionCreateParamsNonStreaming, { maxRetries: 0, timeout: 30_000 });
}
