"use client";

import { cn } from "@/lib/utils";
import ConsolePanel from "./console-panel";
import { JOB_STATUS_LABELS, OPEN_JOB_STATUSES, TERMINAL_JOB_STATUSES } from "@/jobs/jobs.validators";

/**
 * The pipeline, read off the enum that defines it.
 *
 * Not a decorative list of stages someone wrote for the marketing page: these
 * are the actual statuses a job moves through in the product, imported from the
 * same module the application reads. A stage added or renamed there appears here
 * without anyone remembering to update a landing page.
 *
 * Heat rises along the run rather than each stage getting its own colour. The
 * page has one accent, and the progression is information the accent can carry
 * on its own.
 */
export default function PipelineStrip() {
  const openStages = OPEN_JOB_STATUSES;

  return (
    <ConsolePanel
      label="Pipeline"
      reading={`${openStages.length + TERMINAL_JOB_STATUSES.length} states`}
    >
      <div className="py-12 lg:py-16">
        <h2 className="console-display max-w-[18ch] text-3xl leading-[1.05] sm:text-4xl lg:text-5xl">
          A job is a thing you are working, not a search result.
        </h2>

        <p className="mt-5 max-w-[58ch] text-sm leading-relaxed text-[var(--console-dim)] sm:text-base">
          Every posting carries a status, a history of how it got there, and the note you wrote at
          the time. Months later, that is the only thing that can answer what you applied to and
          what happened next.
        </p>

        <ol className="mt-10 flex flex-wrap items-stretch gap-px overflow-hidden border border-[var(--console-rule)] bg-[var(--console-rule)]">
          {openStages.map((status, index) => (
            <li
              key={status}
              className="flex min-w-[7.5rem] flex-1 flex-col justify-between gap-6 bg-[var(--console-panel)] px-4 py-4"
              // Opacity climbing along the run is the whole visual: the further
              // you get, the hotter the stage reads.
              style={{ opacity: 0.55 + (index / (openStages.length - 1)) * 0.45 }}
            >
              <span className="console-mono text-[10px] tracking-[0.16em] text-[var(--console-dim)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-[13px] font-medium leading-tight">
                {JOB_STATUS_LABELS[status]}
              </span>
            </li>
          ))}
        </ol>

        {/* Kept visually apart because they are apart: these are where a job
            stops, and the product's whole argument is that stopping is
            information rather than something to delete. */}
        <div className="mt-px flex flex-wrap gap-px overflow-hidden border-x border-b border-[var(--console-rule)] bg-[var(--console-rule)]">
          {TERMINAL_JOB_STATUSES.map((status) => (
            <span
              key={status}
              className={cn(
                "console-mono flex-1 bg-[var(--console-panel)] px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-[var(--console-dim)]",
              )}
            >
              {JOB_STATUS_LABELS[status]}
            </span>
          ))}
        </div>
      </div>
    </ConsolePanel>
  );
}
