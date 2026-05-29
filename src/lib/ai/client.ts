import OpenAI from "openai";
import { env } from "@/lib/env";

// ─── Constants ────────────────────────────────────────────────────────────────

const JOB_DESCRIPTION_EXCERPT_LENGTH = 800;
const LEAD_ABOUT_EXCERPT_LENGTH = 400;
const LEAD_POSTS_EXCERPT_LENGTH = 300;

// ─── Clients ──────────────────────────────────────────────────────────────────

// OpenRouter — free + paid models via one key
const openrouterClient = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
    "X-Title": "AI Job Hunter",
  },
});

// Direct OpenAI — used when model is gpt-* and OPENAI_API_KEY is set
const openaiClient = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

// gpt-* models go direct to OpenAI if a key is present, else fall back to OpenRouter
export function getClient(model: string): OpenAI {
  const isOpenAIModel = model.startsWith("gpt-") || model.startsWith("o1-") || model.startsWith("o3-");
  if (isOpenAIModel && openaiClient) return openaiClient;
  return openrouterClient;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageTemplate = "hiring_manager" | "recruiter" | "referral";

export interface GenerateMessageInput {
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  jobUrl: string;
  leadFirstName: string;
  leadTitle: string;
  leadHeadline?: string;
  leadAbout?: string;
  leadRecentPosts?: string;
  resumeText: string;
  elevatorPitch: string;
  userSkills: string[];
  template: MessageTemplate;
  model: string;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateOutreachMessage(input: GenerateMessageInput): Promise<string> {
  const client = getClient(input.model);

  const response = await client.chat.completions.create({
    model: input.model,
    max_tokens: 500,
    messages: [
      { role: "system", content: buildSystemPrompt(input) },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });

  return response.choices[0]?.message?.content ?? "";
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(input: GenerateMessageInput): string {
  return `
You are an expert job search coach who writes highly personalized LinkedIn outreach messages.

## Rules:
- Messages must be SHORT. Max 150 words. Hiring managers are busy.
- NEVER use generic openers like "I hope this message finds you well."
- ALWAYS reference something specific about their company or the role.
- Lead with value, not desperation.
- Be human and direct. Not corporate.
- End with ONE clear, low-friction ask (15-minute call).
- Do NOT use bullet points in the message.
- Do NOT include a subject line.
- Output ONLY the message body. No preamble, no explanation.

## The sender's background:
${input.resumeText || "Not provided"}

## Their elevator pitch:
${input.elevatorPitch || "Not provided"}

## Their top skills:
${input.userSkills.join(", ") || "Not specified"}
  `.trim();
}

function buildUserPrompt(input: GenerateMessageInput): string {
  const jobContext = `
## The job they're hiring for:
Title: ${input.jobTitle}
Company: ${input.jobCompany}
Job URL: ${input.jobUrl}
Description excerpt:
${input.jobDescription.slice(0, JOB_DESCRIPTION_EXCERPT_LENGTH)}
  `.trim();

  const leadContext = `
## The person you're writing to:
Name: ${input.leadFirstName}
Title: ${input.leadTitle}
Headline: ${input.leadHeadline ?? "N/A"}
About section: ${input.leadAbout?.slice(0, LEAD_ABOUT_EXCERPT_LENGTH) ?? "N/A"}
Recent posts: ${input.leadRecentPosts?.slice(0, LEAD_POSTS_EXCERPT_LENGTH) ?? "N/A"}
  `.trim();

  const templateInstructions: Record<MessageTemplate, string> = {
    hiring_manager: `
Write a LinkedIn message to ${input.leadFirstName}, who is likely the hiring manager for this role.
- Reference the specific role and one concrete thing from the job description.
- Connect the sender's specific achievement (with a number if possible) to what the role needs.
- Mention one specific detail about the company.
- End with a 15-minute call ask.
    `,
    recruiter: `
Write a LinkedIn message to ${input.leadFirstName}, who is a recruiter sourcing for this role.
- Mention the specific role they're sourcing.
- Give 2-3 credentials that directly match the job description.
- State availability and interest clearly.
- End with a 15-minute call ask.
    `,
    referral: `
Write a LinkedIn message to ${input.leadFirstName}, who works at ${input.jobCompany} but may not be the direct hiring manager.
- Do NOT directly ask for a job or referral.
- Express genuine curiosity about the company culture.
- Ask for a 15-minute conversation about their experience working there.
    `,
  };

  return `
${jobContext}

${leadContext}

## Instructions:
${templateInstructions[input.template]}
  `.trim();
}
