import { z } from "zod";

export const AVAILABLE_MODELS = [
  // ── Free (via OpenRouter) ───────────────────────────────────────────────────
  { id: "google/gemini-2.0-flash-exp:free", name: "Gemini 2.0 Flash — Free (OpenRouter)" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B — Free (OpenRouter)" },
  { id: "mistralai/mistral-nemo:free", name: "Mistral Nemo — Free (OpenRouter)" },
  // ── OpenAI (direct — needs OPENAI_API_KEY; new accounts get free credits) ──
  { id: "gpt-4o-mini", name: "GPT-4o Mini — Cheap (OpenAI)" },
  { id: "gpt-4o", name: "GPT-4o — Best (OpenAI)" },
  // ── Paid via OpenRouter ─────────────────────────────────────────────────────
  { id: "anthropic/claude-haiku-4-5", name: "Claude Haiku — Paid (OpenRouter)" },
  { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet — Paid (OpenRouter)" },
] as const;

export const DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free";

export const extractFromCvSchema = z.object({
  pdfBase64: z.string().min(1),
});

export const saveCriteriaSchema = z.object({
  titles: z.array(z.string().min(1)).min(1, "Add at least one job title"),
  salaryMin: z.number().min(0).optional(),
  locations: z.array(z.string().min(1)).min(1, "Add at least one location"),
  companySizeMin: z.number().min(1).optional(),
  companySizeMax: z.number().min(1).optional(),
  industries: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  resumeText: z.string().optional(),
  elevatorPitch: z.string().optional(),
  model: z.string().min(1),
});

export type SaveCriteriaInput = z.infer<typeof saveCriteriaSchema>;
