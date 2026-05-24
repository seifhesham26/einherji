import { z } from "zod";

export const messageStatusValues = ["draft", "approved", "sent", "edited"] as const;
export const messageTemplateValues = ["hiring_manager", "recruiter", "referral"] as const;

export const messageStatusSchema = z.enum(messageStatusValues);
export const messageTemplateSchema = z.enum(messageTemplateValues);

export const getMessagesSchema = z.object({
  status: messageStatusSchema.optional().default("draft"),
});

export const generateMessageSchema = z.object({
  leadId: z.string().min(1),
  template: messageTemplateSchema.default("hiring_manager"),
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
