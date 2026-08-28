import { describe, expect, it } from "vitest";
import { annualiseSalary, normaliseCurrency } from "./annualise-salary";

describe("annualiseSalary", () => {
  it("leaves an annual figure alone", () => {
    expect(annualiseSalary(60_000, "year")).toBe(60_000);
  });

  it("multiplies a monthly figure by twelve", () => {
    expect(annualiseSalary(5_000, "month")).toBe(60_000);
  });

  it("uses working days for a day rate", () => {
    expect(annualiseSalary(400, "day")).toBe(104_000);
  });

  it("uses the 2,080-hour year for an hourly rate", () => {
    // The contract rates on Freelancer and HN are quoted hourly, and this is the
    // conversion those rates are written against.
    expect(annualiseSalary(45, "hour")).toBe(93_600);
  });

  it("rounds rather than carrying fractions into an integer column", () => {
    expect(annualiseSalary(4_166.67, "month")).toBe(50_000);
  });

  it("refuses to guess when the period is unknown", () => {
    // "50000" could be a yearly salary or a monthly one in EGP. Filling in
    // "year" would be right often enough to be trusted and wrong often enough
    // to matter.
    expect(annualiseSalary(50_000, null)).toBeNull();
  });

  it("returns null for a missing amount", () => {
    expect(annualiseSalary(null, "year")).toBeNull();
    expect(annualiseSalary(undefined, "month")).toBeNull();
  });

  it("rejects zero and negatives", () => {
    expect(annualiseSalary(0, "year")).toBeNull();
    expect(annualiseSalary(-100, "month")).toBeNull();
  });

  it("rejects a figure no salary reaches", () => {
    // Boards do publish these — usually minor currency units pasted into a field
    // expecting major ones — and one of them makes every sort by salary useless.
    expect(annualiseSalary(500_000_000, "year")).toBeNull();
    expect(annualiseSalary(50_000_000, "month")).toBeNull();
  });

  it("keeps a large but real salary", () => {
    expect(annualiseSalary(900_000, "year")).toBe(900_000);
  });

  it("rejects a non-finite amount", () => {
    expect(annualiseSalary(Number.NaN, "year")).toBeNull();
    expect(annualiseSalary(Number.POSITIVE_INFINITY, "year")).toBeNull();
  });
});

describe("normaliseCurrency", () => {
  it("upper-cases a valid code", () => {
    expect(normaliseCurrency("usd")).toBe("USD");
  });

  it("trims surrounding whitespace", () => {
    expect(normaliseCurrency(" EGP ")).toBe("EGP");
  });

  it("rejects a symbol", () => {
    expect(normaliseCurrency("$")).toBeNull();
  });

  it("rejects a sentence", () => {
    expect(normaliseCurrency("US Dollars")).toBeNull();
  });

  it("returns null for nothing", () => {
    expect(normaliseCurrency(null)).toBeNull();
    expect(normaliseCurrency("")).toBeNull();
  });
});
