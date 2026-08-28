"use client";

import ConsolePanel from "./console-panel";
import { TRIAGE_SHORTCUTS } from "@/hooks/jobs/useJobTriageKeyboard";

/**
 * The keyboard, as keys.
 *
 * Read from the same constant the handler switches on, so a shortcut that stops
 * working stops being advertised at the same moment. It is also the section that
 * makes the strongest claim on the page without making one: a product with a
 * real key map is a product someone uses every day, and no adjective says that
 * as well as the map itself.
 */
export default function KeyMap() {
  return (
    <ConsolePanel label="Keyboard" reading={`${TRIAGE_SHORTCUTS.length} bindings`}>
      <div className="py-12 lg:py-16">
        <h2 className="console-display max-w-[16ch] text-3xl leading-[1.05] sm:text-4xl lg:text-5xl">
          Two hundred postings. One pass.
        </h2>

        <p className="mt-5 max-w-[52ch] text-sm leading-relaxed text-[var(--console-dim)] sm:text-base">
          Reviewing a batch with a mouse is two hundred trips across the screen. The whole list is
          built to be cleared without one.
        </p>

        <dl className="mt-10 grid gap-x-10 gap-y-px sm:grid-cols-2 lg:grid-cols-3">
          {TRIAGE_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-baseline gap-4 border-b border-[var(--console-rule)] py-3"
            >
              <dt className="console-mono w-20 shrink-0 border border-[var(--console-rule)] bg-[var(--console-panel)] px-2 py-1 text-center text-[11px] text-[var(--console-ink)]">
                {shortcut.keys}
              </dt>
              <dd className="text-[13px] leading-snug text-[var(--console-dim)]">
                {shortcut.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </ConsolePanel>
  );
}
