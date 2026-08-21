import OpenAI from "openai";
import { env } from "@/lib/env";
import type { MessageTemplate } from "@/messages/messages.validators";

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

export type { MessageTemplate };

/**
 * Who the message is from, which decides everything about how it reads.
 *
 * Three templates write on your own behalf looking for work; two write on the
 * business's behalf. Sharing one system prompt across them is what made the
 * paper factory's supplier enquiries open like a developer's cover letter.
 */
type SenderPersona = "job_seeker" | "service_provider" | "buyer";

const PERSONA_BY_TEMPLATE: Record<MessageTemplate, SenderPersona> = {
  hiring_manager: "job_seeker",
  recruiter: "job_seeker",
  referral: "job_seeker",
  client_pitch: "service_provider",
  supplier_enquiry: "buyer",
};

/** Where the message is going, which sets its length and register. */
export type OutreachChannel = "linkedin" | "whatsapp" | "email";

export interface GenerateMessageInput {
  template: MessageTemplate;
  model: string;
  channel: OutreachChannel;

  // Who it's going to.
  leadFirstName: string;
  leadCompany: string;
  leadTitle: string;
  leadHeadline?: string;
  leadAbout?: string;
  leadRecentPosts?: string;

  /**
   * What the sender is offering (or looking for), in their own words.
   *
   * The bucket's pitch when the lead belongs to one, otherwise the account's
   * elevator pitch. This is the whole sender side for the business personas —
   * they have no CV.
   */
  senderPitch: string;

  // Job-seeking context only. A client or supplier message has no posting behind
  // it and must not carry a résumé.
  jobTitle?: string;
  jobDescription?: string;
  jobUrl?: string;
  resumeText?: string;
  userSkills?: string[];
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

const CHANNEL_RULES: Record<OutreachChannel, string> = {
  linkedin:
    "This is a LinkedIn message. Max 150 words. No subject line. No bullet points.",
  whatsapp:
    "This is a WhatsApp message to a business. Max 90 words — it is read on a phone. " +
    "No subject line, no bullet points, no markdown. Open by saying who you are in one short clause, " +
    "because the recipient has never heard of you and cannot see a profile.",
  email:
    "This is a short email body. Max 150 words. Do NOT write a subject line. No bullet points.",
};

// Shared by every persona: the things that make outreach get ignored.
const UNIVERSAL_RULES = `
- NEVER use generic openers like "I hope this message finds you well."
- ALWAYS reference something specific about them or their business.
- Be human and direct. Not corporate.
- End with ONE clear, low-friction ask.
- Output ONLY the message body. No preamble, no explanation, no sign-off placeholder like [Your Name].
`.trim();

function buildSystemPrompt(input: GenerateMessageInput): string {
  const persona = PERSONA_BY_TEMPLATE[input.template];
  const channelRule = CHANNEL_RULES[input.channel];

  if (persona === "service_provider") {
    return `
You write short business-development outreach for a small software studio approaching a
business that might need what they build.

## Rules:
- ${channelRule}
${UNIVERSAL_RULES}
- Lead with what the recipient gets, not with how long the sender has been in business.
- Do NOT claim specific knowledge of their systems, revenue or problems that isn't given below.
- Do NOT invent case studies, client names or numbers.
- The ask is a short conversation, not a signed contract.

## What the sender does and offers:
${input.senderPitch || "Not provided"}
    `.trim();
  }

  if (persona === "buyer") {
    return `
You write short, polite purchasing enquiries from a business to a potential supplier.

## Rules:
- ${channelRule}
${UNIVERSAL_RULES}
- The sender is the BUYER. They are asking to buy, not selling anything. Never pitch.
- Be concrete about what is being sourced so the supplier can answer in one reply.
- Ask for availability and pricing. Do NOT commit to quantities or prices not given below.
- Courtesy matters more than brevity here, but stay within the length limit.

## The sender's business and what they need:
${input.senderPitch || "Not provided"}
    `.trim();
  }

  return `
You are an expert job search coach who writes highly personalized outreach messages.

## Rules:
- ${channelRule}
${UNIVERSAL_RULES}
- Lead with value, not desperation.
- Connect a concrete achievement to what the role needs.

## The sender's background:
${input.resumeText || "Not provided"}

## Their elevator pitch:
${input.senderPitch || "Not provided"}

## Their top skills:
${input.userSkills?.join(", ") || "Not specified"}
  `.trim();
}

function buildUserPrompt(input: GenerateMessageInput): string {
  const sections: string[] = [];

  // Only job hunts have a posting behind them. Emitting an empty job block for a
  // supplier enquiry invites the model to invent one.
  if (input.jobTitle) {
    sections.push(
      `
## The job they're hiring for:
Title: ${input.jobTitle}
Company: ${input.leadCompany}
Job URL: ${input.jobUrl ?? "N/A"}
Description excerpt:
${(input.jobDescription ?? "").slice(0, JOB_DESCRIPTION_EXCERPT_LENGTH)}
      `.trim(),
    );
  }

  sections.push(
    `
## The person you're writing to:
Name: ${input.leadFirstName}
Business / employer: ${input.leadCompany}
Role or category: ${input.leadTitle || "N/A"}
Headline: ${input.leadHeadline ?? "N/A"}
Notes: ${input.leadAbout?.slice(0, LEAD_ABOUT_EXCERPT_LENGTH) ?? "N/A"}
Recent posts: ${input.leadRecentPosts?.slice(0, LEAD_POSTS_EXCERPT_LENGTH) ?? "N/A"}
    `.trim(),
  );

  sections.push(`## Instructions:\n${TEMPLATE_INSTRUCTIONS[input.template](input)}`);

  return sections.join("\n\n");
}

const TEMPLATE_INSTRUCTIONS: Record<MessageTemplate, (input: GenerateMessageInput) => string> = {
  hiring_manager: (input) =>
    `
Write a message to ${input.leadFirstName}, who is likely the hiring manager for this role.
- Reference the specific role and one concrete thing from the job description.
- Connect the sender's specific achievement (with a number if possible) to what the role needs.
- Mention one specific detail about the company.
- End with a 15-minute call ask.
    `.trim(),

  recruiter: (input) =>
    `
Write a message to ${input.leadFirstName}, who is a recruiter sourcing for this role.
- Mention the specific role they're sourcing.
- Give 2-3 credentials that directly match the job description.
- State availability and interest clearly.
- End with a 15-minute call ask.
    `.trim(),

  referral: (input) =>
    `
Write a message to ${input.leadFirstName}, who works at ${input.leadCompany} but may not be the
direct hiring manager.
- Do NOT directly ask for a job or referral.
- Express genuine curiosity about the company culture.
- Ask for a 15-minute conversation about their experience working there.
    `.trim(),

  client_pitch: (input) =>
    `
Write a first-contact message to ${input.leadFirstName} at ${input.leadCompany}, a business the
sender would like to work with.
- Open by naming what ${input.leadCompany} does, using the details above, so it is obvious this
  was not sent to a list.
- In one sentence, say what the sender builds and who it is for.
- Name ONE specific thing the sender could do for a business like theirs. Keep it plausible and
  concrete — do not promise outcomes or quote a price.
- End by asking whether it's worth a short call, and make saying no easy.
    `.trim(),

  supplier_enquiry: (input) =>
    `
Write a purchasing enquiry to ${input.leadFirstName} at ${input.leadCompany}, a potential supplier.
- The sender wants to BUY from them. Do not pitch or sell anything.
- Say who the sender's business is in one short clause.
- State clearly what is being sourced, based on the sender's description above.
- Ask whether they carry it, and how pricing and delivery work.
- Keep it courteous and plain. If the recipient's details are in Arabic, write in Arabic.
    `.trim(),
};
