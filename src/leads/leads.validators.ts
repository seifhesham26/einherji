import { z } from "zod";
import { HTTP_URL_MESSAGE, isHttpUrl } from "@/utils/is-http-url";

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

// Validation only — no transforms. A schema that rewrites its own output gives
// the form one type and the procedure another, and React Hook Form then can't
// agree with its own resolver. Normalising "" to null belongs in the service.
const optionalText = z.string().trim().max(500).optional();

export const createLeadSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: optionalText,
  title: optionalText,
  company: z.string().trim().min(1, "Company is required").max(200),
  // Rendered directly into an href on the leads table, so the scheme is checked:
  // z.url() alone accepts "javascript:…", which would be stored XSS.
  linkedinUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .refine((value) => !value || isHttpUrl(value), HTTP_URL_MESSAGE),
  headline: optionalText,
  about: z.string().trim().max(5000).optional(),
  jobId: z.string().min(1).optional(),
});

export const updateLeadSchema = z.object({
  id: z.string().min(1),
  status: leadStatusSchema.optional(),
  notes: z.string().optional(),
  nextActionAt: z.string().datetime().optional(),
});

export type LeadStatus = z.infer<typeof leadStatusSchema>;
export type GetLeadsInput = z.infer<typeof getLeadsSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
