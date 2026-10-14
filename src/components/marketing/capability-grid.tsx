import { Target, Keyboard, SlidersHorizontal, Sparkles, CheckCircle2 } from "lucide-react";
import ConsolePanel from "./console-panel";

/**
 * The four things the product actually does, at four different weights.
 *
 * Not four equal cards in a row. The first one is the argument the whole product
 * rests on and gets the space to say so; the other three are supporting and are
 * sized like it.
 */

interface Capability {
  verb: string;
  moduleNum: string;
  lede: string;
  body: string;
  aside: string;
  icon: typeof Target;
}

const CAPABILITIES: Capability[] = [
  {
    verb: "Rank",
    moduleNum: "01",
    lede: "Scored on the way in, with the reasons attached.",
    body: "Every posting is measured against your criteria as it lands, and the number is stored rather than recomputed. That is what lets the database sort by relevance instead of by date, and what turns a pile into an order.",
    aside: "Why a job sits where it sits is written on the card, so a ranking you disagree with is one you can argue with.",
    icon: Target,
  },
  {
    verb: "Triage",
    moduleNum: "02",
    lede: "Four keys, one pass.",
    body: "Move with j and k. Shortlist with s, dismiss with x, open the posting with o. The cursor follows the row rather than its position, so clearing one lands you on the next.",
    aside: "",
    icon: Keyboard,
  },
  {
    verb: "Read",
    moduleNum: "03",
    lede: "Descriptions become filters.",
    body: "A model reads each posting once and pulls out the real seniority, the salary on an annual scale, the stack, and whether remote means remote. Prose becomes columns you can query.",
    aside: "",
    icon: SlidersHorizontal,
  },
  {
    verb: "Write",
    moduleNum: "04",
    lede: "The part that actually takes the hour.",
    body: "A fit report against your CV, requirement by requirement. Then the cover letter, the form's essay answers, CV bullets aimed at this description, and a prep pack once it reaches an interview.",
    aside: "",
    icon: Sparkles,
  },
];

export default function CapabilityGrid() {
  const [lead, ...supporting] = CAPABILITIES;
  const LeadIcon = lead.icon;

  return (
    <ConsolePanel label="Instruments" reading="4 modules" id="instruments">
      <div className="py-12 lg:py-16">
        {/* The Lead Module (Rank) */}
        <article className="overflow-hidden rounded-2xl border border-sky-200/90 bg-white/85 p-8 shadow-[0_16px_40px_-8px_rgba(14,165,233,0.1),0_1px_3px_rgba(15,23,42,0.03)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_48px_-6px_rgba(14,165,233,0.16)] sm:p-10 lg:p-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-1.5 text-xs font-mono font-semibold text-sky-700">
              <LeadIcon className="h-4 w-4 text-sky-600" />
              <span>MODULE {lead.moduleNum} · CORE ENGINE</span>
            </div>
            <span className="console-mono text-xs font-medium text-slate-400">
              Continuous Evaluation
            </span>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <h3 className="console-display bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-700 bg-clip-text text-5xl leading-none text-transparent sm:text-6xl lg:text-7xl">
                {lead.verb}
              </h3>
              <p className="console-display mt-4 max-w-[24ch] text-2xl font-bold leading-[1.1] text-slate-900 sm:text-3xl">
                {lead.lede}
              </p>
              <p className="mt-6 text-sm leading-relaxed text-slate-600 sm:text-base">
                {lead.body}
              </p>
              <div className="mt-6 border-l-2 border-sky-400 bg-sky-50/50 py-2.5 pl-4 pr-3 text-sm leading-relaxed text-slate-700">
                {lead.aside}
              </div>
            </div>

            {/* Interactive Fit Breakdown Visual Card */}
            <div className="flex flex-col justify-center rounded-xl border border-sky-100/90 bg-slate-50/60 p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-sky-100/80 pb-3">
                <span className="console-mono text-xs font-bold uppercase tracking-wider text-slate-700">
                  Sample Scoring Criteria
                </span>
                <span className="console-mono rounded bg-emerald-100/80 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Total Fit: 92/100
                </span>
              </div>

              <div className="mt-4 space-y-3.5">
                {[
                  { label: "Role & Seniority Match", value: "95%", badge: "Senior Frontend" },
                  { label: "Stack & Framework Match", value: "92%", badge: "Next.js, TypeScript" },
                  { label: "Location & Timezone", value: "100%", badge: "Remote, EU/UK" },
                  { label: "Compensation Band", value: "88%", badge: "Within Target Range" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-sky-100/80 bg-white/90 p-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-sky-600" />
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{item.label}</p>
                        <p className="console-mono text-[10px] text-slate-500">{item.badge}</p>
                      </div>
                    </div>
                    <span className="console-mono font-mono text-xs font-bold text-sky-700">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* Supporting Modules (Triage, Read, Write) */}
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {supporting.map((capability) => {
            const Icon = capability.icon;
            return (
              <article
                key={capability.verb}
                className="group flex flex-col justify-between rounded-xl border border-sky-100/90 bg-white/80 p-7 shadow-[0_8px_24px_rgba(14,165,233,0.06)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1.5 hover:border-sky-300 hover:bg-white hover:shadow-[0_16px_36px_rgba(14,165,233,0.14)]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-200/60 bg-sky-50 text-sky-600 shadow-2xs transition-transform group-hover:scale-105">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="console-mono text-[11px] font-bold text-slate-400">
                      MODULE {capability.moduleNum}
                    </span>
                  </div>

                  <h3 className="console-display mt-6 bg-gradient-to-r from-sky-600 to-cyan-600 bg-clip-text text-3xl leading-none font-bold text-transparent sm:text-4xl">
                    {capability.verb}
                  </h3>
                  <p className="console-display mt-3 text-lg font-bold leading-snug text-slate-900">
                    {capability.lede}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {capability.body}
                  </p>
                </div>

                <div className="mt-6 border-t border-sky-100/70 pt-4">
                  <span className="console-mono text-[10px] font-semibold tracking-wider uppercase text-sky-600 group-hover:underline">
                    Interactive Feature →
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </ConsolePanel>
  );
}
