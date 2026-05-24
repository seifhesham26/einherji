import { z } from "zod";

export const leadStatusValues = [
  "not_contacted",
  "message_sent",
  "reply_received",
  "call_scheduled",
  "interview",
  "offer",
  "rejected",
  "no_response",
] as const;

export const leadStatusSchema = z.enum(leadStatusValues);

export const getLeadsSchema = z.object({
  status: leadStatusSchema.optional(),
});

export const updateLeadSchema = z.object({
  id: z.string().min(1),
  status: leadStatusSchema.optional(),
  notes: z.string().optional(),
  nextActionAt: z.string().datetime().optional(),
});

export type LeadStatus = z.infer<typeof leadStatusSchema>;
export type GetLeadsInput = z.infer<typeof getLeadsSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
