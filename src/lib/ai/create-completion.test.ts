import { describe, expect, it, vi } from "vitest";
import type OpenAI from "openai";
import { createCompletion } from "./create-completion";

const request = () => ({ model: "test", max_tokens: 500, messages: [{ role: "user" as const, content: "test" }] });
const fixture = () => {
  const create = vi.fn().mockResolvedValue({ choices: [] });
  return { create, client: { chat: { completions: { create } } } as unknown as OpenAI };
};

describe("bounded text completions", () => {
  it("forwards a valid request exactly once with bounded transport options", async () => {
    const { create, client } = fixture();
    const input = request();
    await expect(createCompletion(client, input)).resolves.toEqual({ choices: [] });
    expect(create).toHaveBeenCalledExactlyOnceWith(input, { maxRetries: 0, timeout: 30_000 });
  });

  it.each([0, -1, 1601, 2.5, NaN, Infinity, undefined])("rejects invalid output limit %s before provider work", async (max_tokens) => {
    const { create, client } = fixture();
    await expect(createCompletion(client, { ...request(), max_tokens })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(create).not.toHaveBeenCalled();
  });

  it.each(["", "x".repeat(201)])("rejects an invalid model ID before provider work", async (model) => {
    const { create, client } = fixture();
    await expect(createCompletion(client, { ...request(), model })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(create).not.toHaveBeenCalled();
  });

  it("bounds the total UTF-8 prompt, including system text and multibyte characters", async () => {
    const { create, client } = fixture();
    const messages = [{ role: "system" as const, content: "x".repeat(32_000) }, { role: "user" as const, content: "\u0627".repeat(16_001) }];
    await expect(createCompletion(client, { ...request(), messages })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(create).not.toHaveBeenCalled();
  });

  it("allows the exact prompt boundary", async () => {
    const { create, client } = fixture();
    await createCompletion(client, { ...request(), max_tokens: 1600, messages: [{ role: "user", content: "x".repeat(64_000) }] });
    expect(create).toHaveBeenCalledOnce();
  });

  it("rejects streaming or non-text payloads that bypass text limits", async () => {
    const { create, client } = fixture();
    await expect(createCompletion(client, { ...request(), stream: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(createCompletion(client, { ...request(), messages: [{ role: "user", content: [{ type: "text", text: "test" }] }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(create).not.toHaveBeenCalled();
  });

  it("propagates provider failure without another attempt", async () => {
    const { create, client } = fixture();
    const failure = new Error("Unknown billing outcome");
    create.mockRejectedValue(failure);
    await expect(createCompletion(client, request())).rejects.toBe(failure);
    expect(create).toHaveBeenCalledOnce();
  });

  it.each([{ n: 2 }, { max_completion_tokens: 3000 }, { messages: [] }, { messages: [{ role: "assistant" as const, content: null }] }])(
    "rejects alternate unbounded request shapes %j", async (extra) => {
      const { create, client } = fixture();
      await expect(createCompletion(client, { ...request(), ...extra })).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(create).not.toHaveBeenCalled();
    },
  );
});
