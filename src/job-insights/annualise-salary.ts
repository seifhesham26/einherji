/**
 * Puts every quoted salary on one scale: per year.
 *
 * "60k", "5,000 a month" and "$45/hr" are the same field on three boards, and
 * until they are comparable a minimum-salary filter can only ever be a text
 * match. The model is asked for the number and its period and nothing more —
 * arithmetic is not what a language model is for, and a model that silently
 * multiplies by twelve is a model you cannot check.
 */

export type SalaryPeriod = "year" | "month" | "week" | "day" | "hour";

// Working days and working hours, not calendar ones: a day rate is quoted
// against days worked. 52 five-day weeks and the 2,080-hour year are the
// conventions contract rates are actually written against.
const PERIODS_PER_YEAR: Record<SalaryPeriod, number> = {
  year: 1,
  month: 12,
  week: 52,
  day: 260,
  hour: 2080,
};

// Above this the number is not a salary. Boards publish "salary: 100000000"
// often enough — usually a currency with small units pasted into a field
// expecting large ones — and one of those in the data makes every sort useless.
const MAX_PLAUSIBLE_ANNUAL = 100_000_000;

/**
 * The annual equivalent, or null when the input can't support one.
 *
 * Null rather than a guess: a salary filter that silently included rows whose
 * figure was invented is worse than one that leaves them out, because the user
 * cannot see which is which.
 */
export function annualiseSalary(
  amount: number | null | undefined,
  period: SalaryPeriod | null | undefined,
): number | null {
  if (amount === null || amount === undefined) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  // No period means the posting didn't say and the model didn't infer one.
  // Assuming "year" would be right most of the time and catastrophically wrong
  // for the hourly contract rates this app scrapes from Freelancer and HN.
  if (!period) return null;

  const annual = Math.round(amount * PERIODS_PER_YEAR[period]);
  if (annual > MAX_PLAUSIBLE_ANNUAL) return null;

  return annual;
}

/**
 * A currency code, or null.
 *
 * Normalised to upper case because models return "usd" and "USD" at about the
 * same rate, and two spellings of one currency is two currencies as far as any
 * grouping is concerned.
 */
export function normaliseCurrency(currency: string | null | undefined): string | null {
  if (!currency) return null;

  const trimmed = currency.trim().toUpperCase();
  // ISO 4217 codes are exactly three letters. Anything else is a symbol, a
  // sentence, or the model getting creative.
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : null;
}
