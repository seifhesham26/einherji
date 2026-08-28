import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AiResponseError, parseJsonResponse } from "./parse-json-response";

// Every case here is something a free OpenRouter model actually does. The app
// defaults to one, so "the model ignored response_format" is the normal path
// rather than the exception.

const schema = z.object({
  seniority: z.enum(["junior", "mid", "senior"]),
  years: z.number().int().nullable(),
});

describe("parseJsonResponse", () => {
  it("reads a plain JSON object", () => {
    const parsed = parseJsonResponse('{"seniority":"senior","years":5}', schema, "test");

    expect(parsed).toEqual({ seniority: "senior", years: 5 });
  });

  it("unwraps a ```json fence", () => {
    const raw = '```json\n{"seniority":"mid","years":3}\n```';

    expect(parseJsonResponse(raw, schema, "test")).toEqual({ seniority: "mid", years: 3 });
  });

  it("unwraps a bare fence", () => {
    const raw = '```\n{"seniority":"junior","years":null}\n```';

    expect(parseJsonResponse(raw, schema, "test")).toEqual({ seniority: "junior", years: null });
  });

  it("ignores a sentence of preamble", () => {
    const raw = 'Sure! Here is the analysis:\n\n{"seniority":"senior","years":8}';

    expect(parseJsonResponse(raw, schema, "test")).toEqual({ seniority: "senior", years: 8 });
  });

  it("ignores trailing commentary after the object", () => {
    const raw = '{"seniority":"mid","years":4}\n\nLet me know if you need anything else!';

    expect(parseJsonResponse(raw, schema, "test")).toEqual({ seniority: "mid", years: 4 });
  });

  it("keeps braces that are inside a string value", () => {
    // The single most likely way a naive first-brace-to-last-brace scan breaks:
    // job descriptions are full of braces, and so are the summaries written
    // about them.
    const braceSchema = z.object({ summary: z.string() });
    const raw = '{"summary":"Uses ${VAR} and { curly } syntax"} trailing text';

    expect(parseJsonResponse(raw, braceSchema, "test")).toEqual({
      summary: "Uses ${VAR} and { curly } syntax",
    });
  });

  it("keeps an escaped quote inside a string value", () => {
    const quoteSchema = z.object({ summary: z.string() });
    const raw = '{"summary":"They call it a \\"platform\\" role"}';

    expect(parseJsonResponse(raw, quoteSchema, "test")).toEqual({
      summary: 'They call it a "platform" role',
    });
  });

  it("handles a nested object without stopping at the inner close", () => {
    const nested = z.object({ outer: z.object({ inner: z.number() }) });

    expect(parseJsonResponse('{"outer":{"inner":1}}', nested, "test")).toEqual({
      outer: { inner: 1 },
    });
  });

  it("rejects a reply that was cut off mid-object", () => {
    // max_tokens hit. The distinguishing symptom is an object that never closes.
    expect(() => parseJsonResponse('{"seniority":"senior","yea', schema, "test")).toThrow(
      AiResponseError,
    );
  });

  it("rejects a refusal, which contains no object at all", () => {
    expect(() =>
      parseJsonResponse("I'm sorry, I can't help with that.", schema, "test"),
    ).toThrow(AiResponseError);
  });

  it("rejects an empty reply", () => {
    expect(() => parseJsonResponse("", schema, "test")).toThrow(AiResponseError);
    expect(() => parseJsonResponse(null, schema, "test")).toThrow(AiResponseError);
  });

  it("names the offending field when the shape is wrong", () => {
    // A wrong-shaped answer is the failure worth being loud about — it is the one
    // that would otherwise be written to the database and read as a real result.
    expect(() => parseJsonResponse('{"seniority":"wizard","years":2}', schema, "fit report"))
      .toThrow(/seniority/);
  });

  it("names the call in its error, so a failure says which one broke", () => {
    expect(() => parseJsonResponse("nonsense", schema, "fit report")).toThrow(/fit report/);
  });
});
