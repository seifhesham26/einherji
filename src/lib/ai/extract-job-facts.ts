import { resolveAiClient, type AiCredentials } from "./resolve-ai-client";
import { parseJsonResponse } from "./parse-json-response";
import {
  extractedJobFactsSchema,
  type ExtractedJobFacts,
} from "@/job-insights/job-insights.validators";

/**
 * Reads a job description once, so its contents become filters forever.
 *
 * Everything useful about a posting — how senior it is, what it pays, whether
 * the "remote" flag means remote — is prose in a description field, which means
 * "senior only" and "at least 60k" can only ever be text matches. One completion
 * per job turns that prose into columns, and the columns are what the list can
 * then be queried on.
 *
 * Deliberately not run during a scrape: a batch of 200 jobs would be 200
 * completions inside a request already capped at sixty seconds. It's a separate
 * pass over the backlog.
 */

// Enough of the posting to hold the requirements section, which is what most of
// these fields come from. Descriptions run to tens of thousands of characters —
// mostly boilerplate about benefits and equal opportunity — and sending all of
// it multiplies the cost of every extraction for no better answer.
const DESCRIPTION_LIMIT = 6000;

// The reply is a small flat object. This is roughly four times what it needs,
// which is what stops a chatty model from being cut off mid-object.
const MAX_TOKENS = 700;

export interface ExtractJobFactsInput {
  model: string;
  title: string;
  company: string;
  location?: string | null;
  /** The board's own salary string, which is often the only place a figure appears. */
  salaryText?: string | null;
  description: string;
  credentials?: AiCredentials;
}

const SYSTEM_PROMPT = `
You read job postings and return structured facts about them. You are a parser, not an assistant.

## Rules
- Output ONE JSON object and nothing else. No prose, no markdown fence, no explanation.
- Report only what the posting states or clearly implies. Never infer from the company name,
  the industry, or what is typical for the role.
- Use null wherever the posting does not say. Null is the expected answer for most fields on
  most postings, and is always better than a plausible guess.

## Fields
- seniority: one of intern, junior, mid, senior, staff, principal, lead, unknown.
  Judge it from the stated responsibilities and years of experience, NOT from the job title —
  titles say "Senior" for roles wanting two years and say nothing for roles wanting eight.
- yearsExperienceMin: the smallest number of years asked for, as an integer, or null.
  "3-5 years" is 3. "at least 5" is 5. No stated requirement is null.
- techStack: concrete named technologies, languages, frameworks, databases and tools.
  Names only, as written ("PostgreSQL", "React", "AWS"). Not skills ("communication"),
  not categories ("frontend frameworks"). Empty array if none are named.
- salary: the figures exactly as quoted, with the period they are quoted in. Do NOT convert
  between periods — report "5000" and "month", never the annual equivalent. currency is the
  ISO code (USD, EUR, EGP, GBP). null when no figure appears anywhere.
- remotePolicy: one of remote, hybrid, onsite, unknown. "Remote" alongside a required office
  presence — any number of days on site — is hybrid, not remote.
- offersVisaSponsorship: true only if sponsorship or relocation support is offered,
  false only if it is explicitly refused, null otherwise. Most postings are null.
- language: the ISO 639-1 code of the language the posting itself is written in.

## Shape
{
  "seniority": "senior",
  "yearsExperienceMin": 5,
  "techStack": ["React", "TypeScript", "PostgreSQL"],
  "salary": { "min": 60000, "max": 80000, "currency": "USD", "period": "year" },
  "remotePolicy": "hybrid",
  "offersVisaSponsorship": null,
  "language": "en"
}
`.trim();

export async function extractJobFacts(input: ExtractJobFactsInput): Promise<ExtractedJobFacts> {
  const client = resolveAiClient(input.model, input.credentials);

  const response = await client.chat.completions.create({
    model: input.model,
    max_tokens: MAX_TOKENS,
    // Extraction is not a creative task, and the same posting should produce the
    // same facts twice.
    temperature: 0,
    // Honoured by the paid models and ignored by several free ones, which is why
    // parseJsonResponse doesn't rely on it.
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(input) },
    ],
  });

  return parseJsonResponse(
    response.choices[0]?.message?.content,
    extractedJobFactsSchema,
    "job analysis",
  );
}

function buildPrompt(input: ExtractJobFactsInput): string {
  return `
Title: ${input.title}
Company: ${input.company}
Location: ${input.location || "Not stated"}
Salary field from the job board: ${input.salaryText || "Not stated"}

Description:
${input.description.slice(0, DESCRIPTION_LIMIT)}
  `.trim();
}
