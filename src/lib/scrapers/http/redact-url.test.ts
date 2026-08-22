import { describe, expect, it } from "vitest";
import { redactUrl } from "./redact-url";

describe("redactUrl", () => {
  // Regression: a failed Adzuna call reported its full URL, app_id and app_key
  // included, and that string is persisted to scrape_runs.errorMessage and shown
  // in the run history.
  it("strips credentials Adzuna passes in the query string", () => {
    const redacted = redactUrl(
      "https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=65378558&app_key=400de3d4&what=engineer&where=Cairo",
    );

    expect(redacted).not.toContain("65378558");
    expect(redacted).not.toContain("400de3d4");
    // The parts that make the error diagnosable have to survive.
    expect(redacted).toContain("what=engineer");
    expect(redacted).toContain("where=Cairo");
    expect(redacted).toContain("api.adzuna.com/v1/api/jobs/gb/search/1");
  });

  it("covers the other names credentials travel under", () => {
    const redacted = redactUrl(
      "https://example.test/feed?api_key=a&access_token=b&client_secret=c&signature=d&page=2",
    );

    expect(redacted).not.toMatch(/=(a|b|c|d)(&|$)/);
    expect(redacted).toContain("page=2");
  });

  it("strips userinfo credentials", () => {
    expect(redactUrl("https://user:hunter2@example.test/feed")).not.toContain("hunter2");
  });

  it("drops the query wholesale when the string will not parse as a URL", () => {
    expect(redactUrl("not a url?app_key=secret")).toBe("not a url");
  });

  it("leaves ordinary URLs untouched", () => {
    expect(redactUrl("https://boards.greenhouse.io/acme?page=2")).toBe(
      "https://boards.greenhouse.io/acme?page=2",
    );
  });
});
