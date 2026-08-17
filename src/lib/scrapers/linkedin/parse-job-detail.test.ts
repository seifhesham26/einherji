import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseJobDetail } from "./parse-job-detail";

const jobDetailHtml = readFileSync(join(__dirname, "__fixtures__/job-detail.html"), "utf-8");

describe("parseJobDetail", () => {
  it("extracts a substantial description", () => {
    const detail = parseJobDetail(jobDetailHtml);
    expect(detail.description).toBeTruthy();
    expect(detail.description!.length).toBeGreaterThan(200);
  });

  it("returns plain text with no markup left behind", () => {
    const { description } = parseJobDetail(jobDetailHtml);
    expect(description).not.toContain("<");
    expect(description).not.toContain("&amp;");
    expect(description).not.toContain("&lt;");
  });

  it("preserves paragraph structure, since the description feeds an LLM prompt", () => {
    const { description } = parseJobDetail(jobDetailHtml);
    expect(description).toContain("\n");
  });

  it("reads the job criteria list", () => {
    const detail = parseJobDetail(jobDetailHtml);
    // Not every posting fills these in, so assert the shape rather than a value.
    expect(detail).toHaveProperty("seniority");
    expect(detail).toHaveProperty("employmentType");
  });

  it("degrades to nulls instead of throwing on unrecognised markup", () => {
    expect(parseJobDetail("<html><body></body></html>")).toEqual({
      description: null,
      salary: null,
      seniority: null,
      employmentType: null,
    });
  });
});
