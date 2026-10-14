"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The product, running.
 *
 * This is the one thing the page is remembered by, so it is the one place the
 * page spends any boldness. A ranked queue clearing itself under simulated
 * keystrokes is the single most characteristic thing Einherji does, and it takes
 * about ten seconds to show - far less than it takes to explain.
 *
 * It is a real preview rather than a picture of one: the rows use the same score
 * bands and the same status vocabulary the application does, so it cannot drift
 * into advertising behaviour the product does not have.
 *
 * The rows are illustrative. The companies are invented, and the page says so
 * once, quietly, rather than implying these are customers.
 */

interface QueueRow {
  score: number;
  title: string;
  company: string;
  location: string;
  /** What the scripted operator decides. `s` keeps it, `x` drops it. */
  verdict: "s" | "x";
}

// Scores are deliberately uneven. A demo queue reading 90 / 80 / 70 is a demo
// queue nobody believes.
const QUEUE: QueueRow[] = [
  { score: 92, title: "Senior Frontend Engineer", company: "Halden Systems", location: "Remote, EU", verdict: "s" },
  { score: 88, title: "Product Engineer, Web", company: "Corvus Labs", location: "Berlin", verdict: "s" },
  { score: 74, title: "React Developer", company: "Northgate Rail", location: "Manchester", verdict: "x" },
  { score: 71, title: "Full Stack Engineer", company: "Aeryn Health", location: "Remote, UK", verdict: "s" },
  { score: 58, title: "Frontend Developer (Contract)", company: "Vellum Type", location: "Cairo", verdict: "x" },
  { score: 41, title: "Junior Web Developer", company: "Southbank Media", location: "London", verdict: "x" },
];

// The score bands the application itself uses, so the colour here means what it
// means everywhere else.
const STRONG_SCORE = 70;
const FAIR_SCORE = 40;

// Half a step is a cursor move, the other half is the keystroke. Slow enough to
// follow, quick enough that the whole queue clears before anyone scrolls past.
const STEP_MS = 640;
const HOLD_STEPS = 3;

const KEYS = ["j", "k", "s", "x"] as const;

function scoreTone(score: number): string {
  if (score >= STRONG_SCORE) return "bg-sky-50 text-sky-700 border border-sky-300/80 shadow-[0_0_8px_rgba(14,165,233,0.15)]";
  if (score >= FAIR_SCORE) return "bg-slate-100 text-slate-700 border border-slate-200";
  return "bg-slate-50 text-slate-400 border border-slate-100";
}

export default function TriageDemo() {
  const totalSteps = QUEUE.length * 2 + HOLD_STEPS;
  // Starts part-worked rather than at zero, which does two jobs at once: the
  // panel is never blank on first paint, and anyone who has asked for reduced
  // motion is left looking at a queue that has clearly been used rather than one
  // that never started. The run simply continues from here and wraps, so after a
  // few seconds the starting point is invisible.
  const [step, setStep] = useState(QUEUE.length);

  useEffect(() => {
    // Read once rather than subscribed to: this decides whether to start a timer
    // at all, not a value that has to stay live.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // The only state write is inside the interval. Setting it from the effect
    // body would be a cascading render on every mount for no gain - the resting
    // value above is already the right first frame.
    const timer = window.setInterval(() => {
      setStep((current) => (current + 1) % totalSteps);
    }, STEP_MS);

    return () => window.clearInterval(timer);
  }, [totalSteps]);

  const cursorIndex = Math.floor(step / 2);
  const isFiring = step % 2 === 1;
  const firingKey = isFiring ? QUEUE[cursorIndex]?.verdict : null;

  const resolvedCount = QUEUE.filter((_, index) => isResolved(index)).length;
  const progressPercent = Math.round((resolvedCount / QUEUE.length) * 100);

  function isResolved(index: number): boolean {
    if (index < cursorIndex) return true;
    return index === cursorIndex && isFiring;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-sky-200/90 bg-white/90 shadow-[0_16px_40px_-8px_rgba(14,165,233,0.12),0_1px_3px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      {/* Top Header Rail */}
      <div className="flex items-center justify-between gap-4 border-b border-sky-100/90 bg-sky-50/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-600" />
          </span>
          <span className="console-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-800">
            Today&apos;s queue
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-sky-100/80 px-2 py-0.5 text-[10px] font-mono font-medium text-sky-700">
            Fit Rank: Active
          </span>
        </div>
      </div>

      {/* Queue items */}
      <ul className="divide-y divide-sky-100/70">
        {QUEUE.map((row, index) => {
          const resolved = isResolved(index);
          const isCursor = index === cursorIndex;

          return (
            <li
              key={row.company}
              className={cn(
                "flex items-center gap-3 px-4 py-3 transition-all duration-300 sm:gap-4",
                isCursor &&
                  !resolved &&
                  "bg-gradient-to-r from-sky-50/90 via-sky-50/40 to-transparent shadow-[inset_3px_0_0_#0ea5e9]",
                resolved && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "console-mono flex h-7 w-9 shrink-0 items-center justify-center rounded text-xs font-bold transition-all",
                  scoreTone(row.score),
                )}
              >
                {row.score}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">
                  {row.title}
                </p>
                <p className="console-mono truncate text-[11px] text-slate-500">
                  {row.company} <span className="text-sky-300">/</span> {row.location}
                </p>
              </div>

              {/* Status Outcome Badge */}
              <div className="w-[84px] shrink-0 text-right">
                {resolved ? (
                  row.verdict === "s" ? (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-200/70">
                      Shortlist
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200/70">
                      Dismissed
                    </span>
                  )
                ) : isCursor ? (
                  <span className="console-mono inline-block animate-pulse text-[10px] font-semibold tracking-wider uppercase text-sky-600">
                    Evaluating
                  </span>
                ) : (
                  <span className="text-[10px] text-transparent">Pending</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Bottom control bar with 3D tactile keys and progress meter */}
      <div className="border-t border-sky-100/90 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="console-mono mr-1 text-[10px] uppercase tracking-wider text-slate-400">
              Keys:
            </span>
            {KEYS.map((key) => (
              <kbd
                key={key}
                className={cn(
                  "console-mono flex h-7 w-7 items-center justify-center rounded border border-sky-200/90 bg-white text-xs font-semibold lowercase text-slate-700 shadow-[0_2px_0_#bae6fd] transition-all",
                  firingKey === key && "console-strike",
                )}
              >
                {key}
              </kbd>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="console-mono text-[11px] font-medium text-slate-600">
              {resolvedCount}/{QUEUE.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
