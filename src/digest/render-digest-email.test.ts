import { describe, expect, it } from "vitest";
import {
  buildSubject,
  renderDigestHtml,
  renderDigestText,
  renderDigestTelegram,
  type DigestContent,
} from "./render-digest-email";

function buildContent(overrides: Partial<DigestContent> = {}): DigestContent {
  return {
    name: "Seif",
    totalNewJobs: 12,
    appUrl: "https://example.com",
    topJobs: [
      {
        title: "Senior React Developer",
        company: "Acme",
        jobUrl: "https://example.com/job/1",
        location: "Remote",
        salary: "$120k",
        score: 92,
        reasons: ["matches react, developer", "remote"],
      },
    ],
    ...overrides,
  };
}

describe("renderDigestHtml", () => {
  it("includes the job, the company and a working link", () => {
    const html = renderDigestHtml(buildContent());

    expect(html).toContain("Senior React Developer");
    expect(html).toContain("Acme");
    expect(html).toContain("https://example.com/job/1");
  });

  // Titles and company names come from third-party feeds. An unescaped angle
  // bracket injects markup straight into the reader's inbox.
  it("escapes markup coming from the feed", () => {
    const html = renderDigestHtml(
      buildContent({
        topJobs: [
          {
            title: '<img src=x onerror="alert(1)">Engineer',
            company: 'Evil & "Co"',
            jobUrl: "https://example.com/job/2",
            location: null,
            salary: null,
            score: 50,
            reasons: [],
          },
        ],
      }),
    );

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
    expect(html).toContain("Evil &amp;");
  });

  it("says how many more are waiting rather than listing everything", () => {
    const html = renderDigestHtml(buildContent({ totalNewJobs: 12 }));
    expect(html).toContain("11 more");
  });

  it("omits the overflow line when everything is shown", () => {
    const html = renderDigestHtml(buildContent({ totalNewJobs: 1 }));
    expect(html).not.toContain("more waiting");
  });

  it("always offers a way to turn the emails off", () => {
    expect(renderDigestHtml(buildContent())).toContain("/settings");
  });
});

describe("renderDigestText", () => {
  it("carries the same jobs and links as the HTML", () => {
    const text = renderDigestText(buildContent());

    expect(text).toContain("Senior React Developer");
    expect(text).toContain("https://example.com/job/1");
    expect(text).not.toContain("<");
  });
});

describe("buildSubject", () => {
  // The subject decides whether it gets opened at all, so it leads with the
  // single best match rather than a count.
  it("leads with the top match", () => {
    expect(buildSubject(buildContent())).toBe(
      "12 new jobs — top pick: Senior React Developer at Acme",
    );
  });

  it("reads naturally for a single job", () => {
    expect(buildSubject(buildContent({ totalNewJobs: 1 }))).toBe(
      "New job: Senior React Developer at Acme",
    );
  });

  it("handles having nothing to report", () => {
    expect(buildSubject(buildContent({ topJobs: [], totalNewJobs: 0 }))).toBe(
      "No new jobs today",
    );
  });
});

describe("renderDigestTelegram", () => {
  it("uses only tags Telegram accepts", () => {
    const message = renderDigestTelegram(buildContent());

    // Telegram rejects the whole message on an unknown tag, so the email's
    // <div>/<table>/<p> markup would simply never arrive.
    expect(message).not.toMatch(/<(div|table|tr|td|p|h1)/);
    expect(message).toContain("<b>");
    expect(message).toContain("<a href=");
  });

  it("includes the jobs and their links", () => {
    const message = renderDigestTelegram(buildContent());

    expect(message).toContain("Senior React Developer");
    expect(message).toContain("https://example.com/job/1");
  });

  it("escapes markup coming from the feed", () => {
    const message = renderDigestTelegram(
      buildContent({
        topJobs: [
          {
            title: "<script>alert(1)</script>Engineer",
            company: "A & B",
            jobUrl: "https://example.com/job/9",
            location: null,
            salary: null,
            score: 40,
            reasons: [],
          },
        ],
      }),
    );

    expect(message).not.toContain("<script>");
    expect(message).toContain("&lt;script&gt;");
    expect(message).toContain("A &amp; B");
  });

  it("stays inside Telegram's message limit for a full digest", () => {
    const message = renderDigestTelegram(
      buildContent({
        topJobs: Array.from({ length: 5 }, (_, index) => ({
          title: `Very Long Job Title Number ${index} `.repeat(4),
          company: "A Company With A Fairly Long Name Ltd",
          jobUrl: `https://example.com/job/${index}`,
          location: "Cairo, Egypt",
          salary: "$100k-$150k",
          score: 80,
          reasons: ["matches react"],
        })),
      }),
    );

    expect(message.length).toBeLessThan(4096);
  });
});
