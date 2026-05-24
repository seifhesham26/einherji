import { PDFParse } from "pdf-parse";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { DEFAULT_MODEL } from "@/criteria/criteria.validators";

export interface ExtractedCvData {
  skills: string[];
  elevatorPitch: string;
  resumeText: string;
  suggestedTitles: string[];
}

const openrouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
    "X-Title": "AI Job Hunter",
  },
});

export async function extractCvFromPdf(pdfBase64: string): Promise<ExtractedCvData> {
  const buffer = Buffer.from(pdfBase64, "base64");
  const uint8 = new Uint8Array(buffer);

  const parser = new PDFParse({ data: uint8 });
  const result = await parser.getText();
  await parser.destroy();

  const rawText = result.text.trim();

  if (!rawText) {
    return { skills: [], elevatorPitch: "", resumeText: "", suggestedTitles: [] };
  }

  const response = await openrouterClient.chat.completions.create({
    model: DEFAULT_MODEL,
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

  const content = response.choices[0]?.message?.content ?? "{}";
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
