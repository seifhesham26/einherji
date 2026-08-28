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
  if (score >= STRONG_SCORE) return "text-[var(--console-signal)]";
  if (score >= FAIR_SCORE) return "text-[var(--console-ink)]";
  return "text-[var(--console-dim)]";
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

  function isResolved(index: number): boolean {
    if (index < cursorIndex) return true;
    return index === cursorIndex && isFiring;
  }

  return (
    <div className="border border-[var(--console-rule)] bg-[var(--console-panel)]">
      <div className="flex items-center justify-between gap-4 border-b border-[var(--console-rule)] px-4 py-2.5">
        <span className="console-mono text-[11px] uppercase tracking-[0.2em] text-[var(--console-dim)]">
          Today&apos;s queue
        </span>
        <span className="console-mono text-[11px] text-[var(--console-dim)]">
          sorted by fit
        </span>
      </div>

      <ul>
        {QUEUE.map((row, index) => {
          const resolved = isResolved(index);
          const isCursor = index === cursorIndex;

          return (
            <li
              key={row.company}
              className={cn(
                "flex items-center gap-3 border-b border-[var(--console-rule)] px-4 py-2.5 transition-all duration-300 sm:gap-4",
                // The cursor is an inset bar rather than a border, so a row never
                // changes height as it moves and the list never shifts.
                isCursor && !resolved && "bg-[var(--console-raised)] shadow-[inset_2px_0_0_var(--console-signal)]",
                resolved && "opacity-35",
              )}
            >
              <span
                className={cn(
                  "console-mono w-8 shrink-0 text-right text-sm font-medium",
                  scoreTone(row.score),
                )}
              >
                {row.score}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight">{row.title}</p>
                <p className="console-mono truncate text-[11px] text-[var(--console-dim)]">
                  {row.company} / {row.location}
                </p>
              </div>

              {/* The outcome, in the application's own words. Reserved width, so
                  a row does not jump sideways the moment it resolves. */}
              <span
                className={cn(
                  "console-mono w-[68px] shrink-0 text-right text-[10px] uppercase tracking-[0.14em]",
                  resolved ? "text-[var(--console-dim)]" : "text-transparent",
                )}
              >
                {row.verdict === "s" ? "Shortlist" : "Dismissed"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {KEYS.map((key) => (
            <kbd
              key={key}
              className={cn(
                "console-mono flex h-6 w-6 items-center justify-center border border-[var(--console-rule)] text-[11px] lowercase text-[var(--console-dim)]",
                firingKey === key && "console-strike border-[var(--console-signal)]",
              )}
            >
              {key}
            </kbd>
          ))}
        </div>

        <span className="console-mono text-[11px] text-[var(--console-dim)]">
          {resolvedCount}/{QUEUE.length} cleared
        </span>
      </div>
    </div>
  );
}
