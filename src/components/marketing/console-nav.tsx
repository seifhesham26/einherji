"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { ARE_SIGNUPS_OPEN } from "@/lib/signups";
import { resolvePrimaryAction } from "./primary-action";

/**
 * The console's top rail.
 *
 * One line, always. It condenses rather than wraps, and the wordmark is set in
 * the data face because on this page the product's name is a readout like
 * everything else.
 *
 * The solid backing appears once the page has scrolled, and that is detected
 * with an observer on a sentinel at the very top rather than a scroll listener -
 * one callback when the answer changes, instead of one per frame forever.
 */
export default function ConsoleNav() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const primaryAction = resolvePrimaryAction(Boolean(session));

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHasScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="absolute top-0 h-px w-full" aria-hidden />

      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          hasScrolled
            ? "border-b border-sky-100/80 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_-4px_rgba(14,165,233,0.08)]"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="group flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-[0_2px_8px_rgba(14,165,233,0.35)] transition-transform group-hover:scale-105">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            </span>
            <span className="console-mono text-sm font-bold tracking-[0.22em] uppercase text-[var(--console-ink)] transition-colors group-hover:text-sky-600">
              Einherji
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-3">
            {/* Sign in only appears beside the primary action when the primary
                action is something else. With signups closed they are the same
                door, and offering it twice is clutter. */}
            {!session && ARE_SIGNUPS_OPEN && (
              <Link
                href="/login"
                className="console-mono rounded-md px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--console-dim)] transition-colors hover:bg-sky-50/60 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
              >
                Sign in
              </Link>
            )}

            <Link
              href={primaryAction.href}
              className="console-mono ice-shimmer group relative overflow-hidden rounded-md border border-sky-400/80 bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_2px_12px_rgba(14,165,233,0.25)] transition-all hover:shadow-[0_4px_20px_rgba(14,165,233,0.4)] hover:brightness-105 active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
            >
              {primaryAction.label}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
