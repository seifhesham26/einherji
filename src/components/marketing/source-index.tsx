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
          <h2 className="console-display text-3xl leading-[1.05] sm:text-4xl lg:text-5xl">
            Nineteen boards, one row per job.
          </h2>
          <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-[var(--console-dim)] sm:text-base">
            The same role syndicated to three aggregators arrives as three postings everywhere
            else. Here it is one card that names the other two, because a fingerprint of the
            company, title and city recognises it as the job you already saw.
          </p>
        </div>

        {/* A dense block rather than a grid of tiles. Nineteen names do not each
            need a box, and the density is the point: this is a lot of ground. */}
        <ul className="flex flex-wrap gap-x-6 gap-y-3 self-center">
          {LIVE_SOURCES.map((source) => (
            <li
              key={source}
              className="console-mono text-sm tracking-tight text-[var(--console-dim)] transition-colors hover:text-[var(--console-ink)]"
            >
              {sourceLabel(source)}
            </li>
          ))}
        </ul>
      </div>
    </ConsolePanel>
  );
}
