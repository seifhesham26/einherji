import { resolveAiClient, type AiCredentials } from "./resolve-ai-client";
import type { JobDocumentKind } from "@/job-documents/job-documents.validators";

/**
 * Writes the things you would otherwise write by hand for every application.
 *
 * The AI in this app could write exactly one thing: a short outbound DM to a
 * named human. Meanwhile the expensive parts of applying — the letter, the four
 * essay questions, re-pointing the CV, preparing for the call — were all done by
 * hand, and all of them are well within what a model does reliably.
 *
 * Prose out, not JSON: these are documents a person reads and edits, and forcing
 * them through a schema would only add a way for them to fail.
 */

const DESCRIPTION_LIMIT = 6000;
const RESUME_LIMIT = 6000;

// Per kind, because a cover letter and an interview prep pack are not the same
// length of answer and a shared ceiling would either truncate one or overpay for
// the other.
const MAX_TOKENS: Record<JobDocumentKind, number> = {
  cover_letter: 700,
  application_answer: 600,
  cv_bullets: 800,
  interview_prep: 1400,
};

export interface WriteJobDocumentInput {
  kind: JobDocumentKind;
  model: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  resumeText: string;
  skills?: string[];
  /** The application's own question, for an answer. */
  prompt?: string;
  /**
   * What the fit report said to lead with, when one has been run.
   *
   * The single best thing to feed a cover letter: it is already the answer to
   * "what in this CV speaks to this posting", worked out against this exact
   * description rather than guessed at again from scratch.
   */
  emphasise?: string[];
  credentials?: AiCredentials;
}

// The rules that make all four readable rather than the thing people can spot at
// a glance and bin.
const HOUSE_STYLE = `
- Write in the candidate's own voice, plainly. No corporate register, no throat-clearing.
- Use ONLY what the CV supports. Never invent an employer, a number, a project or a year.
  If the CV does not show something the posting wants, do not imply that it does.
- No filler openers ("I am writing to express my interest", "I hope this finds you well").
- No em-dash-heavy prose, no lists of three adjectives, no "passionate about".
- Output the document itself and nothing else. No preamble, no commentary, no
  "[Your Name]" placeholder, no markdown fence.
`.trim();

const BRIEFS: Record<JobDocumentKind, string> = {
  cover_letter: `
Write a cover letter for this posting.

- Four short paragraphs at most. Under 300 words.
- Open with the specific reason this role and this company, drawn from the description.
  Not "I saw your posting".
- The middle carries one or two concrete things from the CV that answer what the posting
  actually asks for. Name the work, and the outcome if the CV gives one.
- Close with a plain, short statement of availability and interest.
- Do not restate the CV. The reader has it.
  `.trim(),

  application_answer: `
Answer the application question below, as the candidate.

- Answer the question that was asked. Do not drift into a general pitch.
- Under 200 words unless the question clearly wants more.
- Ground it in something specific from the CV. A generic answer is worse than a short one.
- Plain prose, first person. No bullet points unless the question asks for a list.
  `.trim(),

  cv_bullets: `
Rewrite the candidate's most relevant CV bullets so they point at this description.

- Six to eight bullets, drawn from the experience already in the CV.
- Each starts with a verb, names the work, and carries the outcome the CV gives.
  Never invent a metric the CV does not contain.
- Use the posting's own vocabulary where the CV's work genuinely matches it — the same
  thing called by the name their screening will look for.
- After the bullets, add a short section headed "What changed" listing, in one line each,
  which bullets you re-angled and how. The candidate has to be able to stay honest about
  what they are sending.
  `.trim(),

  interview_prep: `
Write an interview prep pack for this role.

Three sections, in this order and with these headings:

"Likely questions" — eight questions derived from THIS description, not generic ones.
For each, one line on what they are really checking, and one line naming what in the
candidate's CV answers it.

"Where you're exposed" — up to four things the posting asks for that the CV does not
clearly show, and a plain, honest line on how to handle each being raised.

"About the company" — what the posting itself reveals about the team, the stack, the stage
and how they work. Only what the posting says. Do not supply outside facts about the
company, and say so plainly if the posting reveals little.
  `.trim(),
};

export async function writeJobDocument(input: WriteJobDocumentInput): Promise<string> {
  const client = resolveAiClient(input.model, input.credentials);

  const response = await client.chat.completions.create({
    model: input.model,
    max_tokens: MAX_TOKENS[input.kind],
    // Warmer than the extraction calls: this is writing, and a letter generated
    // at temperature 0 reads like one.
    temperature: 0.7,
    messages: [
      { role: "system", content: buildSystemPrompt(input) },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  return response.choices[0]?.message?.content?.trim() ?? "";
}

function buildSystemPrompt(input: WriteJobDocumentInput): string {
  return `
You help one candidate apply for one specific job. You write as them, not about them.

## Rules
${HOUSE_STYLE}

## The brief
${BRIEFS[input.kind]}
  `.trim();
}

function buildUserPrompt(input: WriteJobDocumentInput): string {
  const sections = [
    `## The posting
Title: ${input.jobTitle}
Company: ${input.company}

${input.jobDescription.slice(0, DESCRIPTION_LIMIT)}`,
    `## The candidate's CV
${input.resumeText.slice(0, RESUME_LIMIT)}`,
  ];

  if (input.skills?.length) {
    sections.push(`## Skills they list separately\n${input.skills.join(", ")}`);
  }

  if (input.emphasise?.length) {
    sections.push(
      `## Already identified as the strongest points for this posting
${input.emphasise.map((point) => `- ${point}`).join("\n")}

Lead with these unless the brief says otherwise.`,
    );
  }

  if (input.prompt) {
    sections.push(`## The question to answer\n${input.prompt}`);
  }

  return sections.join("\n\n");
}
