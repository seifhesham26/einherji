"use client";

import ConsolePanel from "./console-panel";
import { sourceLabel } from "@/components/jobs/job-source-labels";
import type { JobSourceName } from "@/lib/scrapers/job-source.types";

/**
 * What it reads, named.
 *
 * "100+ jobs daily" is a claim nobody can check. A list of the boards is one
 * anyone can, and for the audience this page is written for, recognising six of
 * them is worth more than any number.
 *
 * The names come from the same label map the application uses, so a board
 * renamed there is renamed here.
 */

// Only the sources that are actually on. Reddit's adapter exists and stays off:
// switching it on breaks their Responsible Builder Policy, and one of the three
// conditions is structural. X is off because the API costs more per month than
// the coverage is worth. Listing either here would be a claim that is not true.
const LIVE_SOURCES: JobSourceName[] = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "rippling",
  "linkedin_guest",
  "remoteok",
  "arbeitnow",
  "jobicy",
  "themuse",
  "himalayas",
  "weworkremotely",
  "hackernews",
  "hackernews_freelance",
  "wuzzuf",
  "freelancer",
  "adzuna",
  "serpapi",
];

export default function SourceIndex() {
  return (
    <ConsolePanel label="Sources" reading={`${LIVE_SOURCES.length} live`}>
      <div className="grid gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:py-16">
        <div>
          <h2 className="console-display text-3xl leading-[1.05] text-slate-900 sm:text-4xl lg:text-5xl">
            Nineteen boards,{" "}
            <span className="bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent">
              one row per job.
            </span>
          </h2>
          <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-slate-600 sm:text-base">
            The same role syndicated to three aggregators arrives as three postings everywhere
            else. Here it is one card that names the other two, because a fingerprint of the
            company, title and city recognises it as the job you already saw.
          </p>

          <div className="mt-8 rounded-xl border border-sky-200/70 bg-gradient-to-br from-sky-50/80 to-cyan-50/50 p-4 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
              <span className="console-mono text-xs font-bold uppercase tracking-wider text-sky-800">
                Automated Canonical Merging
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Cross-board syndication collapses into a single unified record, preserving all source
              links while eliminating redundant triage loops.
            </p>
          </div>
        </div>

        {/* Frosted interactive chips for all 19 live sources */}
        <div className="self-center">
          <ul className="flex flex-wrap gap-2.5">
            {LIVE_SOURCES.map((source) => (
              <li
                key={source}
                className="group flex items-center gap-2 rounded-lg border border-sky-100/90 bg-white/85 px-3.5 py-2 text-xs font-medium text-slate-700 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50/80 hover:text-sky-800 hover:shadow-xs"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#34d399]" />
                <span className="console-mono tracking-tight">{sourceLabel(source)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </ConsolePanel>
  );
}
