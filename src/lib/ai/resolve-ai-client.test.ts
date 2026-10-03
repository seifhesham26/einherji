import { beforeEach, describe, expect, it, vi } from "vitest";

const { env } = vi.hoisted(() => ({
  env: {
    OPENAI_API_KEY: "server-openai",
    OPENROUTER_API_KEY: "server-openrouter",
    OPENAI_FUNDED_MODELS: undefined as string | undefined,
    OPENROUTER_FUNDED_MODELS: undefined as string | undefined,
    NEXT_PUBLIC_APP_URL: "https://einherji.example",
  },
}));

vi.mock("@/lib/env", () => ({ env }));

import { resetAiClientCache, resolveAiClient } from "./resolve-ai-client";

describe("AI funding policy", () => {
  beforeEach(() => {
    resetAiClientCache();
    env.OPENAI_API_KEY = "server-openai";
    env.OPENROUTER_API_KEY = "server-openrouter";
    env.OPENAI_FUNDED_MODELS = undefined;
    env.OPENROUTER_FUNDED_MODELS = undefined;
  });

  it.each(["gpt-test", "vendor/test:free", "vendor/test-paid"])(
    "rejects %s when server funding is not configured",
    (model) => {
      expect(() => resolveAiClient(model)).toThrow(
        expect.objectContaining({ code: "FORBIDDEN" }),
      );
    },
  );

  it("uses a personal OpenAI key without a platform allowance", () => {
    const client = resolveAiClient("gpt-test", { openaiApiKey: " personal-openai " });
    expect(client.apiKey).toBe("personal-openai");
    expect(client.baseURL).toBe("https://api.openai.com/v1");
  });

  it("prefers personal OpenRouter over the server's direct OpenAI key", () => {
    env.OPENAI_FUNDED_MODELS = "gpt-test";
    const client = resolveAiClient("gpt-test", { openrouterApiKey: " personal-router " });
    expect(client.apiKey).toBe("personal-router");
    expect(client.baseURL).toBe("https://openrouter.ai/api/v1");
  });

  it("prefers personal direct OpenAI when both compatible personal keys exist", () => {
    const client = resolveAiClient("gpt-test", {
      openaiApiKey: "personal-openai",
      openrouterApiKey: "personal-router",
    });
    expect(client.apiKey).toBe("personal-openai");
  });

  it("routes non-OpenAI models through personal OpenRouter", () => {
    const client = resolveAiClient("vendor/test", {
      openaiApiKey: "personal-openai",
      openrouterApiKey: "personal-router",
    });
    expect(client.apiKey).toBe("personal-router");
  });

  it("does not treat blank personal keys as funding authorization", () => {
    expect(() => resolveAiClient("gpt-test", {
      openaiApiKey: " ", openrouterApiKey: " ",
    })).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("does not use a personal OpenAI key for an incompatible model", () => {
    expect(() => resolveAiClient("vendor/test", {
      openaiApiKey: "personal-openai",
    })).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("allows an explicitly funded direct OpenAI model", () => {
    env.OPENAI_FUNDED_MODELS = "gpt-test";
    const client = resolveAiClient("gpt-test");
    expect(client.apiKey).toBe("server-openai");
    expect(client.baseURL).toBe("https://api.openai.com/v1");
  });

  it("allows an explicitly funded OpenRouter model", () => {
    env.OPENROUTER_FUNDED_MODELS = "vendor/test";
    const client = resolveAiClient("vendor/test");
    expect(client.apiKey).toBe("server-openrouter");
    expect(client.baseURL).toBe("https://openrouter.ai/api/v1");
  });

  it("keeps funding authorization provider-specific", () => {
    env.OPENROUTER_FUNDED_MODELS = "gpt-test";
    const client = resolveAiClient("gpt-test");
    expect(client.apiKey).toBe("server-openrouter");
    expect(client.baseURL).toBe("https://openrouter.ai/api/v1");
  });

  it("does not fall back to an unapproved provider when an approved key is missing", () => {
    env.OPENAI_FUNDED_MODELS = "gpt-test";
    env.OPENAI_API_KEY = "";
    expect(() => resolveAiClient("gpt-test")).toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("trims comma-separated configuration entries", () => {
    env.OPENROUTER_FUNDED_MODELS = " vendor/other, , vendor/test , ";
    expect(resolveAiClient("vendor/test").apiKey).toBe("server-openrouter");
  });

  it.each(["vendor/test-paid", "vendor/test:free", "vendor/testing", "vendor/*"])(
    "does not authorize %s by prefix or wildcard",
    (model) => {
      env.OPENROUTER_FUNDED_MODELS = "vendor/test";
      expect(() => resolveAiClient(model)).toThrow(
        expect.objectContaining({ code: "FORBIDDEN" }),
      );
    },
  );

  it("rechecks authorization even when a server client is cached", () => {
    env.OPENROUTER_FUNDED_MODELS = "vendor/test";
    resolveAiClient("vendor/test");
    env.OPENROUTER_FUNDED_MODELS = "";
    expect(() => resolveAiClient("vendor/test")).toThrow(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("does not share personal clients between accounts with different keys", () => {
    const first = resolveAiClient("vendor/test", { openrouterApiKey: "account-a" });
    const second = resolveAiClient("vendor/test", { openrouterApiKey: "account-b" });
    expect(first.apiKey).toBe("account-a");
    expect(second.apiKey).toBe("account-b");
    expect(first).not.toBe(second);
  });
});
