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
        <h2 className="console-display max-w-[18ch] text-3xl leading-[1.05] text-slate-900 sm:text-4xl lg:text-5xl">
          Two hundred postings.{" "}
          <span className="bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-700 bg-clip-text text-transparent">
            One pass.
          </span>
        </h2>

        <p className="mt-5 max-w-[52ch] text-sm leading-relaxed text-slate-600 sm:text-base">
          Reviewing a batch with a mouse is two hundred trips across the screen. The whole list is
          built to be cleared without one.
        </p>

        <dl className="mt-10 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {TRIAGE_SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="group flex items-center justify-between rounded-xl border border-sky-100/90 bg-white/80 p-4 shadow-2xs backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-white hover:shadow-[0_8px_20px_rgba(14,165,233,0.1)]"
            >
              <dd className="text-[13px] font-medium leading-snug text-slate-700">
                {shortcut.description}
              </dd>
              <dt className="console-mono shrink-0 rounded border border-sky-200/90 bg-white px-2.5 py-1 text-center text-xs font-bold text-sky-800 shadow-[0_2px_0_#bae6fd] transition-colors group-hover:border-sky-400 group-hover:text-sky-600">
                {shortcut.keys}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </ConsolePanel>
  );
}
