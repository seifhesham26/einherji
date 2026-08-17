import type { WorkType } from "./job-source.types";

// Every source spells engagement type differently — "FullTime", "Full-Time",
// "permanent", "Regular Full Time (Salary)". Normalising here keeps the
// per-source adapters free of this bookkeeping.
const WORK_TYPE_PATTERNS: { workType: WorkType; patterns: string[] }[] = [
  // Freelance and contract are checked first: "contract to full-time" is a
  // contract, and a naive full-time check would claim it.
  { workType: "freelance", patterns: ["freelance", "gig", "project-based", "1099"] },
  { workType: "contract", patterns: ["contract", "contractor", "temporary", "temp", "fixed-term", "b2b"] },
  { workType: "internship", patterns: ["intern", "internship", "placement", "co-op", "working student", "werkstudent"] },
  { workType: "part_time", patterns: ["part-time", "part time", "parttime", "teilzeit"] },
  { workType: "full_time", patterns: ["full-time", "full time", "fulltime", "permanent", "regular", "vollzeit"] },
];

export function normalizeWorkType(...candidates: (string | null | undefined)[]): WorkType {
  const haystack = candidates
    .filter((candidate): candidate is string => Boolean(candidate))
    .join(" ")
    .toLowerCase();

  if (!haystack) return "unknown";

  for (const { workType, patterns } of WORK_TYPE_PATTERNS) {
    if (patterns.some((pattern) => haystack.includes(pattern))) return workType;
  }

  return "unknown";
}

const REMOTE_PATTERNS = ["remote", "anywhere", "worldwide", "distributed", "work from home"];

export function detectIsRemote(...candidates: (string | null | undefined)[]): boolean | null {
  const haystack = candidates
    .filter((candidate): candidate is string => Boolean(candidate))
    .join(" ")
    .toLowerCase();

  if (!haystack) return null;
  return REMOTE_PATTERNS.some((pattern) => haystack.includes(pattern));
}
