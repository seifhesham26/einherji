import type { JobStatus } from "@/jobs/jobs.validators";

/**
 * How a job's status looks everywhere it appears.
 *
 * Same reasoning as lead-status-display: the labels and colours are needed by
 * the card, the filter chips and the selection bar, and three copies of a colour
 * map is three chances for them to drift.
 *
 * The palette runs cool-to-warm along the pipeline — grey for untouched, blue
 * once you've picked it up, amber while it's in play, green at an offer — so
 * position is readable before the label is.
 */

interface JobStatusDisplay {
  label: string;
  /** Badge styling — background, text and border in one string. */
  badge: string;
  /** The solid colour, for a dot beside a filter chip. */
  dot: string;
}

const NEUTRAL = {
  badge: "bg-muted text-muted-foreground border-transparent",
  dot: "bg-muted-foreground/50",
};

export const JOB_STATUS_DISPLAY: Record<JobStatus, JobStatusDisplay> = {
  new: {
    label: "New",
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20",
    dot: "bg-slate-400",
  },
  shortlisted: {
    label: "Shortlisted",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
  },
  applying: {
    label: "Applying",
    badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    dot: "bg-sky-500",
  },
  applied: {
    label: "Applied",
    badge: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    dot: "bg-violet-500",
  },
  screening: {
    label: "Screening",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
  },
  interviewing: {
    label: "Interviewing",
    badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    dot: "bg-orange-500",
  },
  offer: {
    label: "Offer",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dot: "bg-emerald-500",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    dot: "bg-red-500",
  },
  ghosted: {
    label: "No response",
    ...NEUTRAL,
  },
  dismissed: {
    label: "Dismissed",
    ...NEUTRAL,
  },
};

/**
 * Display for a status that may be null or from a newer build than this one.
 *
 * Statuses arrive from the database, so an unknown value is a real possibility
 * after a migration. Rendering `undefined` is worse than showing the raw value.
 */
export function getJobStatusDisplay(status: string | null | undefined): JobStatusDisplay {
  if (status && status in JOB_STATUS_DISPLAY) {
    return JOB_STATUS_DISPLAY[status as JobStatus];
  }

  return {
    label: status ? status.replace(/_/g, " ") : JOB_STATUS_DISPLAY.new.label,
    ...NEUTRAL,
  };
}

/**
 * The one-click move offered on a card, per status.
 *
 * Triage is two decisions — keep or drop — and everything else belongs in the
 * full status menu. Offering all ten transitions on every card is how a list
 * becomes unusable.
 */
export const QUICK_ACTIONS: Partial<Record<JobStatus, { next: JobStatus; label: string }>> = {
  new: { next: "shortlisted", label: "Shortlist" },
  shortlisted: { next: "applied", label: "Mark applied" },
  applying: { next: "applied", label: "Mark applied" },
  applied: { next: "interviewing", label: "Got an interview" },
  screening: { next: "interviewing", label: "Got an interview" },
  interviewing: { next: "offer", label: "Got an offer" },
};
