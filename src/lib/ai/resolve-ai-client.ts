import OpenAI from "openai";
import { TRPCError } from "@trpc/server";
import { env } from "@/lib/env";

/**
 * Which account's key pays for a completion.
 *
 * Compatible personal keys take priority. Server keys can only pay for models
 * explicitly approved in that provider's funding allowlist.
 */

export interface AiCredentials {
  openrouterApiKey?: string | null;
  openaiApiKey?: string | null;
}

// Models that go straight to OpenAI when a key for it exists. Everything else
// goes through OpenRouter, which fronts them all under one key.
const OPENAI_MODEL_PREFIXES = ["gpt-", "o1-", "o3-", "o4-"];

function isOpenAIModel(model: string): boolean {
  return OPENAI_MODEL_PREFIXES.some((prefix) => model.startsWith(prefix));
}

function isFundedModel(model: string, allowlist: string | undefined): boolean {
  return (allowlist ?? "").split(",").some((entry) => entry.trim() === model && model.length > 0);
}

// An OpenAI client is a thin wrapper around fetch, but it is built on every
// completion and there are only ever a handful of distinct keys in play. Cached
// by the key itself so two accounts never share one.
const clientCache = new Map<string, OpenAI>();

function openRouterClient(apiKey: string): OpenAI {
  const cacheKey = `openrouter:${apiKey}`;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const client = new OpenAI({
    maxRetries: 0,
    timeout: 30_000,
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
      "X-Title": "Einherji",
    },
  });

  clientCache.set(cacheKey, client);
  return client;
}

function directOpenAIClient(apiKey: string): OpenAI {
  const cacheKey = `openai:${apiKey}`;
  const cached = clientCache.get(cacheKey);
  if (cached) return cached;

  const client = new OpenAI({ apiKey, maxRetries: 0, timeout: 30_000 });
  clientCache.set(cacheKey, client);
  return client;
}

/**
 * The client to run this model through, for this account.
 *
 * Native OpenAI model IDs prefer personal direct OpenAI, then personal
 * OpenRouter. Only after those options do provider-specific server allowlists
 * apply. Provider failures never trigger a switch to a server-funded key.
 */
export function resolveAiClient(model: string, credentials: AiCredentials = {}): OpenAI {
  const { apiKey, provider } = resolveAiConfiguration(model, credentials);
  return provider === "openai" ? directOpenAIClient(apiKey) : openRouterClient(apiKey);
}

export function resolveAiFundingSource(model: string, credentials: AiCredentials = {}): "personal" | "platform" {
  return resolveAiConfiguration(model, credentials).funding;
}

function resolveAiConfiguration(model: string, credentials: AiCredentials): {
  apiKey: string;
  provider: "openai" | "openrouter";
  funding: "personal" | "platform";
} {
  const personalOpenaiKey = credentials.openaiApiKey?.trim();
  if (isOpenAIModel(model) && personalOpenaiKey) return { apiKey: personalOpenaiKey, provider: "openai", funding: "personal" };

  const personalOpenrouterKey = credentials.openrouterApiKey?.trim();
  if (personalOpenrouterKey) return { apiKey: personalOpenrouterKey, provider: "openrouter", funding: "personal" };

  if (!model.endsWith(":free")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Platform AI spending is capped at $0. Choose an enabled free model or use a compatible personal key." });
  }

  if (isFundedModel(model, env.OPENROUTER_FUNDED_MODELS)) {
    const serverKey = env.OPENROUTER_API_KEY?.trim();
    if (serverKey) return { apiKey: serverKey, provider: "openrouter", funding: "platform" };
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "This model is not enabled for server-funded AI. Choose an enabled model or add a compatible personal API key.",
  });
}

/** Test seam — the cache is keyed by secret, so it must be clearable. */
export function resetAiClientCache(): void {
  clientCache.clear();
}
