import { z } from "zod";

// Mirrors muteRuleKindEnum in the schema.
export const muteRuleKindValues = ["company", "title"] as const;
export const muteRuleKindSchema = z.enum(muteRuleKindValues);
export type MuteRuleKind = z.infer<typeof muteRuleKindSchema>;

export const MUTE_RULE_KIND_LABELS: Record<MuteRuleKind, string> = {
  company: "Company",
  title: "Title contains",
};

// Long enough for a full agency name, short enough that nobody pastes a job
// description in and mutes their whole feed.
const MAX_PATTERN_LENGTH = 120;

export const createMuteRuleSchema = z.object({
  kind: muteRuleKindSchema,
  pattern: z.string().trim().min(2, "Too short to be a useful rule").max(MAX_PATTERN_LENGTH),
  // Creating a rule usually means "and get these out of my face now". Opt-out
  // rather than opt-in, because the alternative is a rule that appears to have
  // done nothing.
  dismissExisting: z.boolean().default(true),
});

export const deleteMuteRuleSchema = z.object({
  id: z.string().min(1),
});

export type CreateMuteRuleInput = z.infer<typeof createMuteRuleSchema>;
export type DeleteMuteRuleInput = z.infer<typeof deleteMuteRuleSchema>;
