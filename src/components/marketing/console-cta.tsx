"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";
import { ARE_SIGNUPS_OPEN, SIGNUPS_CLOSED_MESSAGE } from "@/lib/signups";
import { resolvePrimaryAction } from "./primary-action";

/**
 * The close.
 *
 * Off-centre and hard against the grid, like the hero, so the page ends in the
 * same voice it opened in. One action, with the same label it carries in the
 * nav and the hero: a page that calls the same thing three different names is a
 * page that has not decided what it wants.
 */
export default function ConsoleCta() {
  const { ref, isRevealed } = useReveal<HTMLElement>(0.2);
  const { data: session } = useSession();
  const primaryAction = resolvePrimaryAction(Boolean(session));
  // The close is the one place the page should say why the door is shut, rather
  // than quietly changing its button and hoping nobody notices.
  const isClosedToNewAccounts = !session && !ARE_SIGNUPS_OPEN;

  return (
    <section
      ref={ref}
      className={cn(
        "relative overflow-hidden border-t border-sky-100/90",
        isRevealed && "console-revealed",
      )}
    >
      <div className="console-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="animate-ice-aurora pointer-events-none absolute -bottom-20 right-10 h-[480px] w-[580px] rounded-full bg-gradient-to-tl from-sky-400/15 via-cyan-300/10 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-10 left-10 h-[380px] w-[420px] rounded-full bg-gradient-to-br from-blue-400/10 via-sky-200/12 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:py-32">
        <div className="max-w-[26ch]">
          <h2 className="console-display text-4xl leading-[0.98] text-slate-900 sm:text-5xl lg:text-6xl">
            Point it at
            <br />
            <span className="bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent">
              your hunt.
            </span>
          </h2>

          <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-slate-600 sm:text-base">
            {isClosedToNewAccounts
              ? SIGNUPS_CLOSED_MESSAGE
              : "Set your criteria once. The scrape runs on a schedule, the queue is sorted by morning, and the pile stops growing."}
          </p>

          <Link
            href={primaryAction.href}
            className="console-mono ice-shimmer group relative mt-9 inline-block overflow-hidden rounded-md border border-sky-400/80 bg-gradient-to-r from-sky-600 to-cyan-600 px-8 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_4px_20px_rgba(14,165,233,0.35)] transition-all hover:shadow-[0_8px_28px_rgba(14,165,233,0.5)] hover:brightness-105 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
          >
            {primaryAction.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
