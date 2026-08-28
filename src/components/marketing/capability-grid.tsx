"use client";

import ConsolePanel from "./console-panel";

/**
 * The four things the product actually does, at four different weights.
 *
 * Not four equal cards in a row. The first one is the argument the whole product
 * rests on and gets the space to say so; the other three are supporting and are
 * sized like it. Equal cards would say all four matter equally, which is not
 * true and is exactly why that layout reads as filler.
 */

interface Capability {
  /** The heading itself, not a label above one. */
  verb: string;
  lede: string;
  body: string;
  aside: string;
}

const CAPABILITIES: Capability[] = [
  {
    verb: "Rank",
    lede: "Scored on the way in, with the reasons attached.",
    body: "Every posting is measured against your criteria as it lands, and the number is stored rather than recomputed. That is what lets the database sort by relevance instead of by date, and what turns a pile into an order.",
    aside: "Why a job sits where it sits is written on the card, so a ranking you disagree with is one you can argue with.",
  },
  {
    verb: "Triage",
    lede: "Four keys, one pass.",
    body: "Move with j and k. Shortlist with s, dismiss with x, open the posting with o. The cursor follows the row rather than its position, so clearing one lands you on the next.",
    aside: "",
  },
  {
    verb: "Read",
    lede: "Descriptions become filters.",
    body: "A model reads each posting once and pulls out the real seniority, the salary on an annual scale, the stack, and whether remote means remote. Prose becomes columns you can query.",
    aside: "",
  },
  {
    verb: "Write",
    lede: "The part that actually takes the hour.",
    body: "A fit report against your CV, requirement by requirement. Then the cover letter, the form's essay answers, CV bullets aimed at this description, and a prep pack once it reaches an interview.",
    aside: "",
  },
];

export default function CapabilityGrid() {
  const [lead, ...supporting] = CAPABILITIES;

  return (
    <ConsolePanel label="Instruments" reading="4 modules" id="instruments">
      <div className="grid gap-px bg-[var(--console-rule)] py-px lg:grid-cols-3">
        {/* The lead spans the row and carries the extra line. */}
        <article className="bg-[var(--console-ground)] py-12 lg:col-span-3 lg:py-16">
          <h3 className="console-display text-5xl leading-none text-[var(--console-signal)] sm:text-6xl lg:text-7xl">
            {lead.verb}
          </h3>
          <p className="console-display mt-4 max-w-[22ch] text-2xl leading-[1.1] sm:text-3xl">
            {lead.lede}
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-16">
            <p className="text-sm leading-relaxed text-[var(--console-dim)] sm:text-base">
              {lead.body}
            </p>
            <p className="border-l border-[var(--console-rule)] pl-5 text-sm leading-relaxed text-[var(--console-dim)]">
              {lead.aside}
            </p>
          </div>
        </article>

        {supporting.map((capability) => (
          <article key={capability.verb} className="bg-[var(--console-ground)] py-10 lg:px-6 lg:py-12">
            <h3 className="console-display text-3xl leading-none text-[var(--console-signal)] sm:text-4xl">
              {capability.verb}
            </h3>
            <p className="console-display mt-3 text-lg leading-snug">{capability.lede}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--console-dim)]">
              {capability.body}
            </p>
          </article>
        ))}
      </div>
    </ConsolePanel>
  );
}
