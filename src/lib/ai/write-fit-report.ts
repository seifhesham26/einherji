import { resolveAiClient, type AiCredentials } from "./resolve-ai-client";
import { parseJsonResponse } from "./parse-json-response";
import { fitReportSchema, type FitReport } from "@/job-insights/job-insights.validators";

/**
 * Judges one posting against one CV, requirement by requirement.
 *
 * The existing score is a keyword count — cheap enough to run on every row, and
 * unable to tell you that you meet six of a role's eight requirements and which
 * two you don't. That answer is the thing a job hunter actually wants, and it is
 * worth a completion per job because it is asked for one job at a time.
 *
 * The prompt is written to make the report *falsifiable*: every verdict has to
 * cite the line of the CV it rests on, so a percentage you disagree with can be
 * argued with rather than merely distrusted.
 */

const DESCRIPTION_LIMIT = 6000;
const RESUME_LIMIT = 6000;

// A report is a dozen short requirement lines plus three short lists. Generous,
// because a truncated object is thrown away entirely.
const MAX_TOKENS = 1600;

export interface WriteFitReportInput {
  model: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  resumeText: string;
  skills?: string[];
  credentials?: AiCredentials;
}

const SYSTEM_PROMPT = `
You assess how well one candidate matches one job posting. You are an honest assessor,
not a cheerleader and not a gatekeeper.

## Rules
- Output ONE JSON object and nothing else. No prose, no markdown fence.
- Judge ONLY against the CV given. Never assume a skill the CV does not show, and never
  credit "transferable" experience the CV does not describe.
- Every verdict must cite its evidence from the CV. A verdict with no evidence is "missing".
- Say what is missing plainly. A report that tells someone they are a great fit for a role
  they will be rejected from wastes a day of their life.

## Fields
- matchPercent: 0-100. The share of the role's real requirements this CV meets, weighted
  towards the ones the posting treats as essential. A "met" is full credit; a "partial" is
  half. Do not round up to be encouraging.
- summary: two sentences. Whether it is worth applying, and the single thing that decides it.
- requirements: up to 12 entries, the requirements the posting actually states, most important
  first. Each has:
  - requirement: the requirement in the posting's own terms, one short line.
  - verdict: "met" | "partial" | "missing".
  - evidence: what in the CV supports the verdict, quoted or closely paraphrased.
    For "missing", say what is absent instead — an empty string is acceptable.
- gaps: up to 5. What is genuinely missing, in the candidate's language. Empty if nothing is.
- emphasise: up to 5. If they apply, what to lead with — specific things from THIS CV that
  answer THIS posting. Not generic advice.

## Shape
{
  "matchPercent": 72,
  "summary": "Worth applying. The React and TypeScript depth is there; the gap is Kubernetes, which the posting lists as required.",
  "requirements": [
    { "requirement": "5+ years building production React", "verdict": "met", "evidence": "Six years of React across two product teams" },
    { "requirement": "Kubernetes in production", "verdict": "missing", "evidence": "No container orchestration anywhere in the CV" }
  ],
  "gaps": ["No Kubernetes experience"],
  "emphasise": ["The payments rewrite — it is the closest thing to their billing work"]
}
`.trim();

export async function writeFitReport(input: WriteFitReportInput): Promise<FitReport> {
  const client = resolveAiClient(input.model, input.credentials);

  const response = await client.chat.completions.create({
    model: input.model,
    max_tokens: MAX_TOKENS,
    // Low but not zero: the verdicts should be stable, while the summary and the
    // emphasis lines read better with a little room.
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(input) },
    ],
  });

  return parseJsonResponse(
    response.choices[0]?.message?.content,
    fitReportSchema,
    "fit report",
  );
}

function buildPrompt(input: WriteFitReportInput): string {
  return `
## The posting
Title: ${input.jobTitle}
Company: ${input.company}

${input.jobDescription.slice(0, DESCRIPTION_LIMIT)}

## The candidate's CV
${input.resumeText.slice(0, RESUME_LIMIT)}

## Skills they list separately
${input.skills?.join(", ") || "None listed"}
  `.trim();
}
