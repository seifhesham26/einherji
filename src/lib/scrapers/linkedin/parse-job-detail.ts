import { parseHTML } from "linkedom";
import { stripHtml } from "@/utils/strip-html";

const SELECTORS = {
  description: "div.description__text--rich, div.show-more-less-html__markup",
  criteriaItem: "li.description__job-criteria-item",
  criteriaLabel: "h3.description__job-criteria-subheader",
  criteriaValue: "span.description__job-criteria-text",
  salary: ".compensation__salary, .salary.compensation__salary",
} as const;

// LinkedIn labels these inconsistently across locales and layouts; we only care
// about seniority and employment type, which are useful prompt context.
const SENIORITY_LABEL = "seniority level";
const EMPLOYMENT_TYPE_LABEL = "employment type";

export interface ParsedJobDetail {
  description: string | null;
  salary: string | null;
  seniority: string | null;
  employmentType: string | null;
}

/**
 * Parses LinkedIn's logged-out job detail fragment.
 *
 * Pure function, tested against a saved fixture — see parse-job-card.ts for why.
 */
export function parseJobDetail(html: string): ParsedJobDetail {
  const { document } = parseHTML(html);

  const descriptionElement = document.querySelector(SELECTORS.description);
  const criteria = readCriteria(document);

  return {
    description: descriptionElement ? stripHtml(descriptionElement.innerHTML) : null,
    salary: document.querySelector(SELECTORS.salary)?.textContent?.trim() || null,
    seniority: criteria.get(SENIORITY_LABEL) ?? null,
    employmentType: criteria.get(EMPLOYMENT_TYPE_LABEL) ?? null,
  };
}

function readCriteria(document: Document): Map<string, string> {
  const criteria = new Map<string, string>();

  for (const item of document.querySelectorAll(SELECTORS.criteriaItem)) {
    const label = item.querySelector(SELECTORS.criteriaLabel)?.textContent?.trim().toLowerCase();
    const value = item.querySelector(SELECTORS.criteriaValue)?.textContent?.trim();
    if (label && value) criteria.set(label, value);
  }

  return criteria;
}
