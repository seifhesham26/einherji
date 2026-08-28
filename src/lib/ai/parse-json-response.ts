import type { z } from "zod";

/**
 * Reads a model's reply as JSON, or says clearly why it couldn't.
 *
 * `response_format: json_object` is honoured by the paid models and treated as a
 * suggestion by several of the free ones this app defaults to. What actually
 * comes back is a fenced block, or a sentence of preamble, or both — so the
 * object has to be found in the text rather than assumed to be all of it.
 *
 * Everything here is recoverable formatting noise. Anything that isn't — a
 * refusal, a truncated object, an answer of the wrong shape — is thrown, because
 * a half-parsed fit report is worse than an error message.
 */

export class AiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiResponseError";
  }
}

// ```json … ``` or a bare ``` … ``` fence around the whole reply.
const FENCED_BLOCK = /^\s*```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/;

/**
 * The outermost JSON object in a string.
 *
 * Brace-counted rather than a regex, and string-aware: a description quoted
 * inside the JSON routinely contains a brace, and matching the first `{` to the
 * last `}` breaks the moment there is any trailing prose.
 */
function extractObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let isInString = false;
  let isEscaped = false;

  for (let index = start; index < text.length; index++) {
    const character = text[index];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (character === "\\") {
      isEscaped = true;
      continue;
    }
    if (character === '"') {
      isInString = !isInString;
      continue;
    }
    if (isInString) continue;

    if (character === "{") depth++;
    else if (character === "}") {
      depth--;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  // Ran out of text with the object still open — the reply was cut off, usually
  // by max_tokens. Worth its own message: the fix is a bigger budget, not a
  // different prompt.
  return null;
}

export function parseJsonResponse<Schema extends z.ZodTypeAny>(
  raw: string | null | undefined,
  schema: Schema,
  /** Named in the error, so a failure says which call went wrong. */
  label: string,
): z.infer<Schema> {
  if (!raw || raw.trim().length === 0) {
    throw new AiResponseError(`The model returned nothing for the ${label}. Try again.`);
  }

  const unfenced = raw.match(FENCED_BLOCK)?.[1] ?? raw;
  const objectText = extractObject(unfenced);

  if (!objectText) {
    throw new AiResponseError(
      `The model's ${label} wasn't valid JSON — it may have been cut off. Try again, or pick a different model in Criteria.`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(objectText);
  } catch {
    throw new AiResponseError(
      `The model's ${label} wasn't valid JSON. Try again, or pick a different model in Criteria.`,
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    // The field paths are the useful part: "requirements.0.verdict" says exactly
    // what the model got wrong, which is what tells you whether the prompt or the
    // model is at fault.
    const issues = result.error.issues
      .slice(0, 3)
      .map((issue) => issue.path.join(".") || "(root)")
      .join(", ");

    throw new AiResponseError(
      `The model's ${label} was missing or malformed: ${issues}. Try again, or pick a different model in Criteria.`,
    );
  }

  return result.data;
}
