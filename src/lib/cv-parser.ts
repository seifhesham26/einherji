import { DEFAULT_MODEL } from "@/criteria/criteria.validators";
import { assertSafeUrl } from "@/lib/scrapers/http/assert-safe-url";

import { getClient } from "@/lib/ai/client";

// A CV is a document, not a data set. Anything past this is not a CV.
const MAX_CV_BYTES = 15 * 1024 * 1024;

export interface ExtractedCvData {
  skills: string[];
  elevatorPitch: string;
  resumeText: string;
  suggestedTitles: string[];
}

export async function extractCvFromUrl(cvUrl: string, model: string = DEFAULT_MODEL): Promise<ExtractedCvData> {
  const { extractText } = await import("unpdf");

  // cvUrl arrives from the client and is only checked by z.url(), which accepts
  // "http://169.254.169.254/…" and "file:///etc/passwd" alike. Without this the
  // endpoint is an SSRF probe any signed-in user can point at our own network.
  await assertSafeUrl(cvUrl);

  const response = await fetch(cvUrl);
  // Deliberately vague: echoing the upstream status turns this into a port scanner.
  if (!response.ok) throw new Error("Couldn't download that CV. Check the link and try again.");

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_CV_BYTES) {
    throw new Error("That file is too large to process.");
  }

  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_CV_BYTES) {
    throw new Error("That file is too large to process.");
  }

  const { text } = await extractText(new Uint8Array(arrayBuffer));
  const rawText = (Array.isArray(text) ? text.join("\n") : text).trim();

  if (!rawText) {
    return { skills: [], elevatorPitch: "", resumeText: "", suggestedTitles: [] };
  }

  const client = getClient(model);

  let completion;
  try {
    completion = await client.chat.completions.create({
      model: model,
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are a CV parser. Extract structured data from CV text.
Return ONLY a valid JSON object — no markdown, no explanation, just the JSON.
Schema:
{
  "skills": string[],           // Up to 20 specific technical and professional skills
  "elevatorPitch": string,      // 2-3 sentence professional summary in first person
  "resumeText": string,         // Cleaned up full resume text, keep achievements and numbers
  "suggestedTitles": string[]   // 3-5 job titles this person would be a strong fit for
}`,
        },
        {
          role: "user",
          content: `Parse this CV:\n\n${rawText.slice(0, 6000)}`,
        },
      ],
    });
  } catch (error: unknown) {
    console.error("AI API Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("429") || msg.includes("rate limit") || msg.includes("Provider returned error")) {
      throw new Error(`The AI provider is currently overloaded or rate-limiting requests. Please wait a moment and try again, or select a different model in the settings.`);
    } else if (msg.includes("404") || msg.includes("No endpoints found")) {
      throw new Error(`The selected AI model (${model}) is currently unavailable or deprecated. Please select a different model in the settings.`);
    } else if (msg.includes("402") || msg.includes("credits")) {
      throw new Error(`Insufficient credits to use this model. Please use a free model or add credits to your OpenRouter/OpenAI account.`);
    }
    throw new Error(`AI extraction failed: ${msg}`);
  }

  const content = completion.choices[0]?.message?.content ?? "{}";
  const cleaned = content.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as Partial<ExtractedCvData>;
    return {
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      elevatorPitch: typeof parsed.elevatorPitch === "string" ? parsed.elevatorPitch : "",
      resumeText: typeof parsed.resumeText === "string" ? parsed.resumeText : rawText,
      suggestedTitles: Array.isArray(parsed.suggestedTitles) ? parsed.suggestedTitles : [],
    };
  } catch {
    return { skills: [], elevatorPitch: "", resumeText: rawText, suggestedTitles: [] };
  }
}
