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
          "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
          hasScrolled
            ? "border-b border-[var(--console-rule)] bg-[var(--console-ground)]/90 backdrop-blur-md"
            : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="console-mono text-sm font-semibold tracking-[0.22em] uppercase text-[var(--console-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
          >
            Einherji
          </Link>

          <div className="flex items-center gap-1 sm:gap-3">
            {/* Sign in only appears beside the primary action when the primary
                action is something else. With signups closed they are the same
                door, and offering it twice is clutter. */}
            {!session && ARE_SIGNUPS_OPEN && (
              <Link
                href="/login"
                className="console-mono px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--console-dim)] transition-colors hover:text-[var(--console-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
              >
                Sign in
              </Link>
            )}

            <Link
              href={primaryAction.href}
              className="console-mono border border-[var(--console-signal)] bg-[var(--console-signal)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#06080c] transition-colors hover:bg-transparent hover:text-[var(--console-signal)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
            >
              {primaryAction.label}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
