import { DAILY_QUOTAS, type UsageAction } from "./usage.validators";

const PILOT_QUOTAS: Record<UsageAction, number> = {
  parse_cv: 1, generate_fit_report: 2, generate_document: 2, scrape: 1,
  find_managers: 0, extract_job_facts: 5, generate_message: 2,
};

export function getDailyQuotaLimits(mode: string | undefined = process.env.SAAS_PILOT_MODE): Record<UsageAction, number> {
  if (mode !== undefined && mode !== "0" && mode !== "1") throw new Error("Invalid pilot mode");
  return mode === "1" ? PILOT_QUOTAS : DAILY_QUOTAS;
}
