import { describe, expect, it } from "vitest";
import { rankJobs, scoreJob, type ScorableJob } from "./score-job";

const query = { titles: ["React Developer"], locations: [] };

function job(overrides: Partial<ScorableJob> = {}): ScorableJob {
  return { title: "Something", postedAt: new Date(), ...overrides };
}

describe("scoreJob", () => {
  it("ranks a job matching every search term above one matching half", () => {
    const both = scoreJob(job({ title: "React Developer" }), query);
    const half = scoreJob(job({ title: "Python Developer" }), query);

    expect(both.score).toBeGreaterThan(half.score);
  });

  it("scores a job matching nothing lowest", () => {
    const none = scoreJob(job({ title: "Warehouse Operative" }), query);
    const some = scoreJob(job({ title: "React Engineer" }), query);

    expect(none.score).toBeLessThan(some.score);
  });

  it("prefers a fresh posting over an old one", () => {
    const today = scoreJob(job({ title: "React Developer" }), query);
    const old = scoreJob(
      job({ title: "React Developer", postedAt: new Date(Date.now() - 60 * 86_400_000) }),
      query,
    );

    expect(today.score).toBeGreaterThan(old.score);
  });

  it("rewards a listing you can act on without more research", () => {
    const bare = scoreJob(job({ title: "React Developer" }), query);
    const detailed = scoreJob(
      job({ title: "React Developer", salary: "$120k", isRemote: true }),
      query,
    );

    expect(detailed.score).toBeGreaterThan(bare.score);
    expect(detailed.reasons).toContain("salary listed");
    expect(detailed.reasons).toContain("remote");
  });

  it("matches on tags as well as the title", () => {
    const tagged = scoreJob(job({ title: "Engineer", tags: ["react"] }), query);
    const untagged = scoreJob(job({ title: "Engineer" }), query);

    expect(tagged.score).toBeGreaterThan(untagged.score);
  });

  // With no criteria there's nothing to judge fit against, so scoring every job
  // as a poor match would make the ranking meaningless rather than neutral.
  it("does not punish every job when there are no criteria", () => {
    const scored = scoreJob(job({ title: "Anything" }), { titles: [], locations: [] });
    expect(scored.score).toBeGreaterThan(50);
  });

  it("stays within 0 and 100", () => {
    const best = scoreJob(
      job({
        title: "React Developer",
        tags: ["react", "developer"],
        salary: "$150k",
        isRemote: true,
        description: "x".repeat(500),
      }),
      query,
    );

    expect(best.score).toBeLessThanOrEqual(100);
    expect(best.score).toBeGreaterThan(0);
  });

  it("works with Arabic criteria", () => {
    const arabicQuery = { titles: ["مهندس"], locations: [] };
    const match = scoreJob(job({ title: "مطلوب مهندس مدني" }), arabicQuery);
    const miss = scoreJob(job({ title: "Warehouse Operative" }), arabicQuery);

    expect(match.score).toBeGreaterThan(miss.score);
  });
});

describe("rankJobs", () => {
  it("puts the best fit first", () => {
    const ranked = rankJobs(
      [
        job({ title: "Warehouse Operative" }),
        job({ title: "React Developer", salary: "$120k", isRemote: true }),
        job({ title: "Python Developer" }),
      ],
      query,
    );

    expect(ranked[0].title).toBe("React Developer");
    expect(ranked[ranked.length - 1].title).toBe("Warehouse Operative");
  });

  it("breaks ties towards the more recent posting", () => {
    const older = job({ title: "React Developer", postedAt: new Date("2026-08-01") });
    const newer = job({ title: "React Developer", postedAt: new Date("2026-08-10") });

    // Same title, same everything but the date.
    const ranked = rankJobs([older, newer], query);
    expect(ranked[0].postedAt).toEqual(newer.postedAt);
  });

  it("leaves the input array untouched", () => {
    const input = [job({ title: "B" }), job({ title: "A" })];
    const before = input.map((entry) => entry.title);

    rankJobs(input, query);
    expect(input.map((entry) => entry.title)).toEqual(before);
  });
});
