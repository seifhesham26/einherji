/**
 * Turns a pasted list of businesses into leads.
 *
 * The input is whatever someone copied out of Google Maps, a directory page or a
 * spreadsheet, so it arrives in no consistent shape: "Name — phone", "Name, phone",
 * tab-separated columns, or just a bare name. Rather than demand a format, this
 * finds the phone number wherever it is and treats what's left as the name.
 *
 * Nothing here throws. A line that can't be read is returned as a problem for the
 * user to look at, because a paste of sixty rows shouldn't be rejected wholesale
 * for one bad line.
 */

// At least seven digits, so a company name containing a number ("Group 4",
// "3M Egypt") is never mistaken for a phone number.
const PHONE_PATTERN = /(\+?\d[\d\s\-()./]{5,}\d)/;
const DIGITS_PATTERN = /\d/g;
const MIN_PHONE_DIGITS = 7;

// Whatever is left clinging to the name once the phone has been cut out.
const TRAILING_SEPARATORS = /^[\s,;|\-–—:/\\]+|[\s,;|\-–—:/\\]+$/g;

export interface ParsedLead {
  line: number;
  name: string;
  phone: string | null;
  /** Anything after the name and phone — usually an address. */
  notes: string | null;
}

export interface ParsedLeadList {
  leads: ParsedLead[];
  /** Lines that had nothing usable on them, kept so the user can see what was dropped. */
  problems: { line: number; text: string; reason: string }[];
}

function countDigits(text: string): number {
  return (text.match(DIGITS_PATTERN) ?? []).length;
}

function tidy(text: string): string {
  return text.replace(TRAILING_SEPARATORS, "").trim();
}

export function parseLeadList(input: string): ParsedLeadList {
  const leads: ParsedLead[] = [];
  const problems: ParsedLeadList["problems"] = [];

  input.split(/\r?\n/).forEach((rawLine, index) => {
    const line = index + 1;
    const text = rawLine.trim();

    // Blank lines are just formatting, not mistakes.
    if (!text) return;

    // Tabs mean it came from a spreadsheet, where the columns are already split.
    const columns = text.includes("\t")
      ? text.split("\t").map((column) => column.trim()).filter(Boolean)
      : null;

    if (columns && columns.length >= 2) {
      const phoneColumn = columns.find((column) => countDigits(column) >= MIN_PHONE_DIGITS);
      const name = tidy(columns.find((column) => column !== phoneColumn) ?? "");

      if (!name) {
        problems.push({ line, text, reason: "no business name on this row" });
        return;
      }

      leads.push({
        line,
        name,
        phone: phoneColumn ?? null,
        notes: columns.filter((c) => c !== phoneColumn && c !== name).join(" · ") || null,
      });
      return;
    }

    const match = text.match(PHONE_PATTERN);
    const candidate = match?.[1] ?? null;
    const phone = candidate && countDigits(candidate) >= MIN_PHONE_DIGITS ? candidate.trim() : null;

    const withoutPhone = phone ? text.replace(phone, " ") : text;
    const name = tidy(withoutPhone);

    if (!name) {
      problems.push({
        line,
        text,
        reason: phone ? "a phone number with no business name" : "nothing recognisable",
      });
      return;
    }

    leads.push({ line, name, phone, notes: null });
  });

  return { leads, problems };
}

/**
 * Drops repeats inside one paste, keeping the first.
 *
 * Copying from a map often catches the same business twice. Letting both through
 * would just produce a duplicate error per pair at import time, which reads like
 * a failure rather than the tidy-up it is.
 */
export function dedupeParsedLeads(leads: ParsedLead[]): ParsedLead[] {
  const seen = new Set<string>();

  return leads.filter((lead) => {
    // Same name, same phone. Case and spacing vary between copies of one listing.
    const key = `${lead.name.toLowerCase().replace(/\s+/g, " ")}|${lead.phone ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
