import type { LeadStatus } from "@/leads/leads.validators";

/**
 * How a lead's status looks everywhere it appears.
 *
 * The labels and colours were copied into four files — the leads table, the
 * activity feed, the kanban columns and the dashboard — and had already drifted:
 * "Offer" was emerald-500 in one place and emerald-600 in another, and adding a
 * status meant remembering all four. One list, one meaning.
 */
export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "not_contacted",
  "message_sent",
  "reply_received",
  "call_scheduled",
  "interview",
  "offer",
  "rejected",
  "no_response",
];

interface LeadStatusDisplay {
  label: string;
  /** Badge styling — background, text and border in one string. */
  badge: string;
  /** The solid colour, for the dot on a kanban column header. */
  dot: string;
  /** Text-only colour, for a column heading beside its dot. */
  heading: string;
}

const NEUTRAL = {
  badge: "bg-muted text-muted-foreground border-transparent",
  dot: "bg-muted-foreground",
  heading: "text-muted-foreground",
};

export const LEAD_STATUS_DISPLAY: Record<LeadStatus, LeadStatusDisplay> = {
  not_contacted: { label: "Not contacted", ...NEUTRAL },
  message_sent: {
    label: "Message sent",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
    heading: "text-blue-600 dark:text-blue-400",
  },
  reply_received: {
    label: "Reply received",
    badge: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    dot: "bg-yellow-500",
    heading: "text-yellow-700 dark:text-yellow-400",
  },
  call_scheduled: {
    label: "Call scheduled",
    badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    dot: "bg-orange-500",
    heading: "text-orange-600 dark:text-orange-400",
  },
  interview: {
    label: "Interview",
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    dot: "bg-violet-500",
    heading: "text-violet-600 dark:text-violet-400",
  },
  offer: {
    label: "Offer",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
    heading: "text-emerald-600 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dot: "bg-red-500",
    heading: "text-red-600 dark:text-red-400",
  },
  no_response: {
    label: "No response",
    ...NEUTRAL,
    dot: "bg-muted-foreground/50",
  },
};

/**
 * Display for a status that may be null or from a newer build than this one.
 *
 * Statuses arrive from the database, so an unknown value is a real possibility
 * after a migration. Rendering `undefined` — which the raw lookups did — is
 * worse than showing the raw value.
 */
export function getLeadStatusDisplay(status: string | null | undefined): LeadStatusDisplay {
  if (status && status in LEAD_STATUS_DISPLAY) {
    return LEAD_STATUS_DISPLAY[status as LeadStatus];
  }

  return {
    label: status ? status.replace(/_/g, " ") : LEAD_STATUS_DISPLAY.not_contacted.label,
    ...NEUTRAL,
  };
}
