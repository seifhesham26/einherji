# 03 — Claude AI Prompts

All message generation goes through `src/lib/claude/client.ts`.
Claude reads the job, the lead's profile, and your background — then drafts a personalized message.

---

## `src/lib/claude/client.ts`

```ts
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export type MessageTemplate = "hiring_manager" | "recruiter" | "referral";

export interface GenerateMessageInput {
  // Job context
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  jobUrl: string;

  // Lead context
  leadFirstName: string;
  leadTitle: string;
  leadHeadline?: string;
  leadAbout?: string;
  leadRecentPosts?: string;

  // Your context
  resumeText: string;
  elevatorPitch: string;
  userSkills: string[];

  // Template
  template: MessageTemplate;
}

export async function generateOutreachMessage(input: GenerateMessageInput): Promise<string> {
  const systemPrompt = buildSystemPrompt(input);
  const userPrompt = buildUserPrompt(input);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content.find((b) => b.type === "text");
  return text?.text ?? "";
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(input: GenerateMessageInput): string {
  return `
You are an expert job search coach who writes highly personalized LinkedIn outreach messages.

## Your rules:
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
${input.resumeText}

## Their elevator pitch:
${input.elevatorPitch}

## Their top skills:
${input.userSkills.join(", ")}
  `.trim();
}

// ─── User Prompt by Template ──────────────────────────────────────────────────

function buildUserPrompt(input: GenerateMessageInput): string {
  const jobContext = `
## The job they're hiring for:
Title: ${input.jobTitle}
Company: ${input.jobCompany}
Job URL: ${input.jobUrl}
Description excerpt:
${input.jobDescription.slice(0, 800)}
  `.trim();

  const leadContext = `
## The person you're writing to:
Name: ${input.leadFirstName}
Title: ${input.leadTitle}
Headline: ${input.leadHeadline ?? "N/A"}
About section: ${input.leadAbout?.slice(0, 400) ?? "N/A"}
Recent posts: ${input.leadRecentPosts?.slice(0, 300) ?? "N/A"}
  `.trim();

  const templateInstructions: Record<MessageTemplate, string> = {
    hiring_manager: `
Write a LinkedIn message to ${input.leadFirstName}, who is likely the hiring manager for this role.
- Reference the specific role and one concrete thing from the job description.
- Connect the sender's specific achievement (with a number) to what the role needs.
- Mention one specific detail about the company (from their about section, recent posts, or known news).
- End with a 15-minute call ask.
    `,
    recruiter: `
Write a LinkedIn message to ${input.leadFirstName}, who is a recruiter or HR person sourcing for this role.
- Mention the specific role they're sourcing.
- Give 2-3 bullet-point credentials that directly match the job description.
- State availability and interest clearly.
- End with a 15-minute call ask.
    `,
    referral: `
Write a LinkedIn message to ${input.leadFirstName}, who works at ${input.jobCompany} but may not be the direct hiring manager.
- Do NOT directly ask for a job or referral.
- Express genuine curiosity about the company culture.
- Ask for a 15-minute conversation about their experience working there.
- This is the "referral approach" — the goal is to get a warm introduction.
    `,
  };

  return `
${jobContext}

${leadContext}

## Instructions:
${templateInstructions[input.template]}
  `.trim();
}
```

---

## API Route — Generate Messages
### `src/app/api/messages/generate/route.ts`

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads, jobs, messages, criteria } from "@/lib/db/schema";
import { generateOutreachMessage } from "@/lib/claude/client";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { leadId, template = "hiring_manager" } = await req.json();

  // Fetch lead + job + criteria
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const [job] = await db.select().from(jobs).where(eq(jobs.id, lead.jobId!)).limit(1);
  const [activeCriteria] = await db.select().from(criteria).where(eq(criteria.isActive, true)).limit(1);

  if (!job || !activeCriteria) {
    return NextResponse.json({ error: "Missing job or criteria" }, { status: 400 });
  }

  const messageBody = await generateOutreachMessage({
    jobTitle: job.title,
    jobCompany: job.company,
    jobDescription: job.description ?? "",
    jobUrl: job.jobUrl,
    leadFirstName: lead.firstName,
    leadTitle: lead.title ?? "",
    leadHeadline: lead.headline ?? undefined,
    leadAbout: lead.about ?? undefined,
    resumeText: activeCriteria.resumeText ?? "",
    elevatorPitch: activeCriteria.elevatorPitch ?? "",
    userSkills: activeCriteria.skills ?? [],
    template,
  });

  // Save draft message
  const [saved] = await db
    .insert(messages)
    .values({
      leadId: lead.id,
      jobId: job.id,
      body: messageBody,
      templateUsed: template,
      status: "draft",
    })
    .returning();

  return NextResponse.json({ message: saved });
}
```

---

## API Route — Approve / Edit Message
### `src/app/api/messages/approve/route.ts`

```ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const { messageId, editedBody } = await req.json();

  const [updated] = await db
    .update(messages)
    .set({
      status: "approved",
      approvedAt: new Date(),
      editedBody: editedBody ?? null,
    })
    .where(eq(messages.id, messageId))
    .returning();

  // Update lead status
  await db
    .update(leads)
    .set({ status: "message_sent", lastContactedAt: new Date() })
    .where(eq(leads.id, updated.leadId));

  return NextResponse.json({ message: updated });
}
```

---

## Prompt Customization Tips

### To improve message quality, paste these into the criteria `elevatorPitch` field:

**Example elevator pitch:**
```
I'm a frontend developer with 1.5 years of experience building production apps with Next.js, TypeScript, and Supabase. I've shipped real products with thousands of active users and I'm expanding into backend development and system design. I write clean, maintainable code and move fast without cutting corners.
```

### For the `resumeText` field, paste a plain-text version of your CV. The more specific achievements with numbers, the better Claude's messages will be.

**Example resume snippet:**
```
- Built and launched [App Name] used by 5,000+ monthly active users
- Reduced page load time by 40% through Next.js optimization and caching strategies
- Led frontend architecture decisions for a team of 3 developers
```
