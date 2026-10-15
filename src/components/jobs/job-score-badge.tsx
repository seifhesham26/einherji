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
    return "bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-300/80 dark:border-sky-700/80 shadow-[0_0_8px_rgba(14,165,233,0.18)]";
  }
  if (score >= FAIR_MATCH) {
    return "bg-slate-100/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800";
  }
  return "bg-slate-50/50 dark:bg-slate-950/50 text-slate-400 dark:text-slate-500 border-slate-200/60 dark:border-slate-900";
}

export default function JobScoreBadge({ score, reasons }: JobScoreBadgeProps) {
  // Rows scraped before scoring existed have no score, and inventing one would
  // rank them against jobs that were genuinely measured.
  if (score === null || score === undefined) {
    return (
      <span
        className="shrink-0 rounded-md border border-dashed border-sky-200/60 dark:border-sky-800/60 px-1.5 py-1 text-[10px] text-muted-foreground console-mono"
        title="Scraped before scoring existed — it'll get a score next time this job is found."
      >
        —
      </span>
    );
  }

  const explanation = reasons?.length ? reasons.join(" · ") : "No specific signals matched";

  return (
    <span
      className={`shrink-0 flex flex-col items-center rounded-lg border px-1.5 py-0.5 tabular-nums console-mono transition-all ${toneFor(score)}`}
      title={`Match score ${score} of 100 — ${explanation}`}
    >
      <span className="text-sm font-bold leading-tight">{score}</span>
      <span className="text-[9px] uppercase font-medium tracking-wide opacity-80 leading-tight">match</span>
    </span>
  );
}
