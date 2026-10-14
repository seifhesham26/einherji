"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import TriageDemo from "./triage-demo";
import { resolvePrimaryAction } from "./primary-action";

/**
 * The thesis, and the proof of it, side by side.
 *
 * The old hero centred a gradient headline over floating orbs and claimed the
 * product scraped LinkedIn and found hiring managers. Both halves of that were
 * wrong: the scraping is the easy part, and the hiring-manager lookup has been
 * blocked since LinkedIn closed the door on it.
 *
 * So the headline says the true thing instead, and the right-hand column proves
 * it rather than illustrating it.
 */
export default function ConsoleHero() {
  const { data: session } = useSession();
  const primaryAction = resolvePrimaryAction(Boolean(session));

  return (
    <section className="relative overflow-hidden border-b border-sky-100/80">
      {/* Glacial drafting grid and ambient arctic aurora glow */}
      <div className="console-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="animate-ice-aurora pointer-events-none absolute -top-40 left-1/4 h-[520px] w-[620px] rounded-full bg-gradient-to-br from-sky-400/15 via-cyan-300/10 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-10 right-10 h-[400px] w-[450px] rounded-full bg-gradient-to-bl from-blue-400/10 via-sky-200/15 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-5 pb-20 pt-28 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-32">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/80 px-3.5 py-1.5 text-xs font-mono font-medium tracking-wide text-sky-700 shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500" />
            </span>
            <span>AUTONOMOUS JOB INTELLIGENCE</span>
          </div>

          <h1 className="console-display text-[2.6rem] leading-[0.95] text-[var(--console-ink)] sm:text-6xl lg:text-[4.5rem]">
            Scraping was never
            <br />
            <span className="bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent">
              the hard part.
            </span>
          </h1>

          <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-[var(--console-dim)] sm:text-lg">
            Einherji ranks every posting it finds, then hands you a queue you can clear with four
            keys.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3.5">
            <Link
              href={primaryAction.href}
              className="console-mono ice-shimmer group relative overflow-hidden rounded-md border border-sky-400/80 bg-gradient-to-r from-sky-600 to-cyan-600 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_4px_16px_rgba(14,165,233,0.3)] transition-all hover:shadow-[0_6px_24px_rgba(14,165,233,0.45)] hover:brightness-105 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
            >
              {primaryAction.label}
            </Link>

            <a
              href="#instruments"
              className="console-mono rounded-md border border-sky-200/80 bg-white/80 px-6 py-3.5 text-xs font-medium uppercase tracking-[0.16em] text-slate-700 backdrop-blur-md shadow-sm transition-all hover:border-sky-300 hover:bg-sky-50/60 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
            >
              What it does
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-sky-100/80 pt-6">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              <span className="console-mono text-[11px] font-medium tracking-tight text-slate-600">
                19 boards indexed
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              <span className="console-mono text-[11px] font-medium tracking-tight text-slate-600">
                Sub-second triage
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="console-mono text-[11px] font-medium tracking-tight text-slate-600">
                Deterministic relevance
              </span>
            </div>
          </div>
        </div>

        <div className="lg:pl-4">
          <div className="rounded-xl shadow-[0_16px_40px_-8px_rgba(14,165,233,0.12),0_1px_3px_rgba(15,23,42,0.04)]">
            <TriageDemo />
          </div>
          {/* Said once, plainly, rather than left for someone to wonder about. */}
          <p className="console-mono mt-3 text-right text-[10px] uppercase tracking-[0.16em] text-[var(--console-dim)]">
            Live simulated operator queue
          </p>
        </div>
      </div>
    </section>
  );
}
