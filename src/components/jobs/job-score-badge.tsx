"use client";

/**
 * The relevance score, and why it is what it is.
 *
 * `scoreJob` has existed and been tested since before this component, and its
 * only consumer was the digest email — so the ranking that decides the order of
 * the whole list was invisible on the list itself. A number with no explanation
 * gets distrusted, so the reasons come with it.
 */

interface JobScoreBadgeProps {
  score: number | null;
  reasons: string[] | null;
}

// Bands rather than a gradient: three legible groups beat a hundred shades that
// all look the same at 11px.
const STRONG_MATCH = 70;
const FAIR_MATCH = 40;

function toneFor(score: number): string {
  if (score >= STRONG_MATCH) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
  }
  if (score >= FAIR_MATCH) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25";
  }
  return "bg-muted text-muted-foreground border-border";
}

export default function JobScoreBadge({ score, reasons }: JobScoreBadgeProps) {
  // Rows scraped before scoring existed have no score, and inventing one would
  // rank them against jobs that were genuinely measured.
  if (score === null || score === undefined) {
    return (
      <span
        className="shrink-0 rounded-md border border-dashed border-border px-1.5 py-1 text-[10px] text-muted-foreground"
        title="Scraped before scoring existed — it'll get a score next time this job is found."
      >
        —
      </span>
    );
  }

  const explanation = reasons?.length ? reasons.join(" · ") : "No specific signals matched";

  return (
    <span
      className={`shrink-0 flex flex-col items-center rounded-md border px-1.5 py-0.5 tabular-nums ${toneFor(score)}`}
      title={`Match score ${score} of 100 — ${explanation}`}
    >
      <span className="text-sm font-semibold leading-tight">{score}</span>
      <span className="text-[9px] uppercase tracking-wide opacity-70 leading-tight">match</span>
    </span>
  );
}
