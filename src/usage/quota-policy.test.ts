import { describe, expect, it } from "vitest";
import { DAILY_QUOTAS } from "./usage.validators";
import { getDailyQuotaLimits } from "./quota-policy";

describe("pilot quota policy", () => {
  it.each([undefined, "0"])("preserves personal limits when pilot mode is %s", (mode) => {
    expect(getDailyQuotaLimits(mode)).toEqual(DAILY_QUOTAS);
  });
  it("selects the small pilot allowance for every action", () => {
    expect(getDailyQuotaLimits("1")).toEqual({
      parse_cv: 1, generate_fit_report: 2, generate_document: 2, scrape: 1,
      find_managers: 0, extract_job_facts: 5, generate_message: 2,
    });
  });
  it.each(["true", "yes", "2", ""])("rejects ambiguous pilot configuration %s", (mode) => {
    expect(() => getDailyQuotaLimits(mode)).toThrow("Invalid pilot mode");
  });
});
