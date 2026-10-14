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
        <h2 className="console-display max-w-[22ch] text-3xl leading-[1.05] text-slate-900 sm:text-4xl lg:text-5xl">
          A job is a thing you are working,{" "}
          <span className="bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent">
            not a search result.
          </span>
        </h2>

        <p className="mt-5 max-w-[58ch] text-sm leading-relaxed text-slate-600 sm:text-base">
          Every posting carries a status, a history of how it got there, and the note you wrote at
          the time. Months later, that is the only thing that can answer what you applied to and
          what happened next.
        </p>

        {/* Active Stage Tiles with Ice Progression */}
        <div className="mt-10 overflow-hidden rounded-xl border border-sky-200/80 bg-white/70 p-2 shadow-[0_12px_32px_-4px_rgba(14,165,233,0.08)] backdrop-blur-md">
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {openStages.map((status, index) => {
              const isFinal = index === openStages.length - 1;
              return (
                <li
                  key={status}
                  className={cn(
                    "group relative flex flex-col justify-between gap-6 rounded-lg border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_20px_rgba(14,165,233,0.14)]",
                    isFinal
                      ? "border-sky-300/90 bg-gradient-to-br from-sky-50 to-cyan-100/90 shadow-[0_0_16px_rgba(14,165,233,0.15)]"
                      : "border-sky-100/90 bg-white/90 hover:border-sky-200 hover:bg-sky-50/50",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="console-mono text-[10px] font-bold tracking-[0.16em] text-sky-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {isFinal && (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <span className="text-[13px] font-semibold leading-tight text-slate-900 group-hover:text-sky-700">
                      {JOB_STATUS_LABELS[status]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Terminal Statuses */}
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-sky-100/90 bg-slate-50/80 p-3 shadow-xs">
          <span className="console-mono mr-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Terminal states:
          </span>
          {TERMINAL_JOB_STATUSES.map((status) => (
            <span
              key={status}
              className="console-mono rounded-md border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[11px] font-medium tracking-[0.1em] text-slate-600 shadow-2xs transition-colors hover:border-sky-200 hover:text-sky-700"
            >
              {JOB_STATUS_LABELS[status]}
            </span>
          ))}
        </div>
      </div>
    </ConsolePanel>
  );
}
