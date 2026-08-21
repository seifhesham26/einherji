import { z } from "zod";
import type { BucketKind } from "@/buckets/buckets.validators";

export const messageStatusValues = ["draft", "approved", "sent", "edited"] as const;

// The first three write on your own behalf, looking for work. The last two write
// on the business's behalf — selling to a prospect, or buying from a supplier.
// They are different jobs with different senders, so they can't share a prompt:
// a paper factory's enquiry to a mill must not open with a React CV.
export const messageTemplateValues = [
  "hiring_manager",
  "recruiter",
  "referral",
  "client_pitch",
  "supplier_enquiry",
] as const;

export const messageStatusSchema = z.enum(messageStatusValues);
export const messageTemplateSchema = z.enum(messageTemplateValues);

export const getMessagesSchema = z.object({
  status: messageStatusSchema.optional().default("draft"),
});

export const generateMessageSchema = z.object({
  leadId: z.string().min(1),
  // Optional, not defaulted: with no explicit choice the server picks from the
  // lead's bucket. Defaulting to "hiring_manager" here is what made every client
  // and supplier message read like a job application.
  template: messageTemplateSchema.optional(),
});

export const markMessageSentSchema = z.object({
  messageId: z.string().min(1),
});

export const approveMessageSchema = z.object({
  messageId: z.string().min(1),
  editedBody: z.string().optional(),
});

export type MessageStatus = z.infer<typeof messageStatusSchema>;
export type MessageTemplate = z.infer<typeof messageTemplateSchema>;
export type GetMessagesInput = z.infer<typeof getMessagesSchema>;
export type GenerateMessageInput = z.infer<typeof generateMessageSchema>;
export type ApproveMessageInput = z.infer<typeof approveMessageSchema>;
export type MarkMessageSentInput = z.infer<typeof markMessageSentSchema>;

export const TEMPLATE_LABELS: Record<MessageTemplate, string> = {
  hiring_manager: "Hiring manager",
  recruiter: "Recruiter",
  referral: "Referral",
  client_pitch: "Client pitch",
  supplier_enquiry: "Supplier enquiry",
};

/** Which templates make sense for a bucket, so the UI never offers a nonsense pair. */
export const TEMPLATES_BY_BUCKET_KIND: Record<BucketKind, MessageTemplate[]> = {
  jobs: ["hiring_manager", "recruiter", "referral"],
  clients: ["client_pitch"],
  suppliers: ["supplier_enquiry"],
  custom: [...messageTemplateValues],
};

/**
 * The template to use when the caller didn't name one.
 *
 * A lead with no bucket falls back to the job-seeking default, which is what
 * every lead was before buckets existed.
 */
export function defaultTemplateForBucketKind(kind: BucketKind | null | undefined): MessageTemplate {
  if (!kind) return "hiring_manager";
  return TEMPLATES_BY_BUCKET_KIND[kind][0] ?? "hiring_manager";
}
