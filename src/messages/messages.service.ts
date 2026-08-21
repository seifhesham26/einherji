import { TRPCError } from "@trpc/server";
import type { Database } from "@/lib/db";
import { generateOutreachMessage, type OutreachChannel } from "@/lib/ai/client";
import { getActiveCriteria } from "@/criteria/criteria.db";
import { getBucketById } from "@/buckets/buckets.db";
import { getLeadById } from "@/leads/leads.db";
import { getJobById } from "@/jobs/jobs.db";
import { setLeadMessageSent } from "@/leads/leads.db";
import { consumeQuota } from "@/usage/usage.service";
import {
  approveMessage,
  getMessages,
  getReadyToSendMessages,
  markMessageSent,
  upsertDraftMessage,
} from "./messages.db";
import {
  defaultTemplateForBucketKind,
  type GetMessagesInput,
  type GenerateMessageInput,
  type ApproveMessageInput,
  type MarkMessageSentInput,
  type MessageTemplate,
} from "./messages.validators";
import type { BucketKind } from "@/buckets/buckets.validators";
import { DEFAULT_MODEL } from "@/criteria/criteria.validators";

const JOB_SEEKING_TEMPLATES: MessageTemplate[] = ["hiring_manager", "recruiter", "referral"];

export async function fetchMessages(db: Database, userId: string, input: GetMessagesInput) {
  return getMessages(db, userId, input.status);
}

/**
 * Writes a draft to one lead, in the voice of whichever hunt they belong to.
 *
 * The bucket is what makes this work for anything other than a job search. Its
 * pitch is the sender's side of the message and its kind picks the template, so
 * a supplier bucket produces a purchasing enquiry from the factory rather than a
 * cover letter from a developer. Before this, `bucket.pitch` was collected by the
 * UI, stored, and read by nothing — every message used the account's CV.
 */
export async function generateAndSaveMessage(db: Database, userId: string, input: GenerateMessageInput) {
  // Charged before the model call, not after — a completion that errors partway
  // can still have been billed.
  await consumeQuota(db, userId, "generate_message");

  // Both scoped to userId. The lead lookup wasn't, which meant supplying someone
  // else's leadId fed their hiring manager's name, headline, about text and
  // recent posts into an LLM prompt and saved the result to your account.
  const [lead, activeCriteria] = await Promise.all([
    getLeadById(db, userId, input.leadId),
    getActiveCriteria(db, userId),
  ]);

  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

  const bucket = lead.bucketId ? await getBucketById(db, userId, lead.bucketId) : null;
  const template = input.template ?? defaultTemplateForBucketKind(bucket?.kind as BucketKind);

  // The bucket's own words win: they describe this hunt, where the account's
  // elevator pitch describes the person. A lead in no bucket falls back to the
  // account, which is what every lead did before buckets existed.
  const senderPitch = bucket?.pitch?.trim() || activeCriteria?.elevatorPitch?.trim() || "";

  if (!senderPitch) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: bucket
        ? `"${bucket.name}" has no pitch yet — edit the bucket and describe what you're offering, so there's something to say on your behalf.`
        : "Nothing to say on your behalf yet. Set up your criteria, or put this lead in a bucket that has a pitch.",
    });
  }

  // A CV belongs in a job application and nowhere else. Sending it with a
  // supplier enquiry is how the paper factory ends up pitching React.
  const isJobSeeking = JOB_SEEKING_TEMPLATES.includes(template);
  const job = isJobSeeking && lead.jobId ? await getJobById(db, userId, lead.jobId) : null;

  const messageBody = await generateOutreachMessage({
    template,
    model: activeCriteria?.model ?? DEFAULT_MODEL,
    channel: resolveChannel(template, lead),

    leadFirstName: lead.firstName,
    leadCompany: lead.company,
    leadTitle: lead.title ?? "",
    leadHeadline: lead.headline ?? undefined,
    leadAbout: lead.about ?? undefined,
    leadRecentPosts: lead.recentPosts ?? undefined,

    senderPitch,

    ...(job ? { jobTitle: job.title, jobDescription: job.description ?? "", jobUrl: job.jobUrl } : {}),
    ...(isJobSeeking
      ? {
          resumeText: activeCriteria?.resumeText ?? "",
          userSkills: activeCriteria?.skills ?? [],
        }
      : {}),
  });

  // Replaces existing draft instead of creating duplicates
  return upsertDraftMessage(db, userId, {
    leadId: lead.id,
    jobId: job?.id ?? null,
    body: messageBody,
    templateUsed: template,
  });
}

/**
 * Which medium the draft is written for.
 *
 * Business outreach is decided by the template rather than by which fields the
 * lead happens to have: a business saved from Places carries its website in
 * `linkedinUrl`, so sniffing that field would call a corner shop a LinkedIn
 * contact. Egyptian B2B runs on phone and WhatsApp, and a WhatsApp message that
 * reads like a LinkedIn note gets ignored.
 */
function resolveChannel(
  template: MessageTemplate,
  lead: { phone: string | null },
): OutreachChannel {
  if (JOB_SEEKING_TEMPLATES.includes(template)) return "linkedin";
  return lead.phone ? "whatsapp" : "email";
}

export async function approveAndUpdateLead(
  db: Database,
  userId: string,
  input: ApproveMessageInput,
) {
  const updated = await approveMessage(db, userId, input.messageId, input.editedBody);
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });

  // The lead is deliberately *not* moved to message_sent here. Approving means
  // "this draft is good", not "I have contacted this person" — marking them
  // contacted at approval time made the tracker claim outreach that never
  // happened. That transition belongs to markMessageAsSent.
  return updated;
}

export async function fetchReadyToSend(db: Database, userId: string) {
  return getReadyToSendMessages(db, userId);
}

/**
 * Records that the user actually sent an approved message.
 *
 * This is the point the lead becomes "contacted" — it's the first moment the
 * claim is true. Sending itself is manual: the app has no email address for a
 * lead (the profile scraper doesn't return one), so the user copies the text and
 * sends it themselves.
 */
export async function markMessageAsSent(
  db: Database,
  userId: string,
  input: MarkMessageSentInput,
) {
  const sent = await markMessageSent(db, userId, input.messageId);
  if (!sent) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No approved message found to mark as sent.",
    });
  }

  await setLeadMessageSent(db, userId, sent.leadId);
  return sent;
}
