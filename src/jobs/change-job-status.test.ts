import { beforeEach, describe, expect, it, vi } from "vitest";

// The service's own logic is what's under test: which events get written, what
// transition they record, and that nothing is written when nothing moved. The
// database calls are stubbed — the SQL itself is covered by the integration
// suite, which needs a real Postgres to mean anything.

const mocks = {
  getJobStatuses: vi.fn(),
  setJobsStatus: vi.fn(),
  insertJobEvents: vi.fn(),
};

vi.mock("./jobs.db", () => ({
  getJobStatuses: (...args: unknown[]) => mocks.getJobStatuses(...args),
  setJobsStatus: (...args: unknown[]) => mocks.setJobsStatus(...args),
  insertJobEvents: (...args: unknown[]) => mocks.insertJobEvents(...args),
  // Imported by the module under test but unreachable from these paths.
  deleteAllJobs: vi.fn(),
  deleteJobsByIds: vi.fn(),
  getJobById: vi.fn(),
  getJobEvents: vi.fn(),
  getJobs: vi.fn(),
  updateJobNotes: vi.fn(),
}));

vi.mock("@/settings/settings.db", () => ({ getSettingsByUserId: vi.fn() }));
vi.mock("@/leads/leads.db", () => ({ insertLeads: vi.fn() }));
vi.mock("@/usage/usage.service", () => ({ consumeQuota: vi.fn() }));
vi.mock("@/lib/apify/client", () => ({ findHiringManagers: vi.fn() }));

const db = {} as never;
const userId = "user_1";

describe("changeJobStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.insertJobEvents.mockResolvedValue([]);
  });

  it("records what each job moved from, not just where it landed", async () => {
    const { changeJobStatus } = await import("./jobs.service");

    mocks.getJobStatuses.mockResolvedValue(
      new Map([
        ["job_1", "new"],
        ["job_2", "shortlisted"],
      ]),
    );
    mocks.setJobsStatus.mockResolvedValue([
      { id: "job_1", status: "applied", title: "A" },
      { id: "job_2", status: "applied", title: "B" },
    ]);

    await changeJobStatus(db, userId, { jobIds: ["job_1", "job_2"], status: "applied" });

    const [, events] = mocks.insertJobEvents.mock.calls[0];
    expect(events).toEqual([
      { userId, jobId: "job_1", kind: "status_change", fromStatus: "new", toStatus: "applied", body: null },
      { userId, jobId: "job_2", kind: "status_change", fromStatus: "shortlisted", toStatus: "applied", body: null },
    ]);
  });

  it("writes no events when nothing actually moved", async () => {
    const { changeJobStatus } = await import("./jobs.service");

    // Everything selected was already in the target status, so the update matched
    // no rows. A timeline full of "moved to applied" for jobs that were already
    // applied is noise the user didn't create.
    mocks.getJobStatuses.mockResolvedValue(new Map([["job_1", "applied"]]));
    mocks.setJobsStatus.mockResolvedValue([]);

    const result = await changeJobStatus(db, userId, { jobIds: ["job_1"], status: "applied" });

    expect(result.updatedCount).toBe(0);
    expect(mocks.insertJobEvents).not.toHaveBeenCalled();
  });

  it("only writes events for the jobs that moved, not everything selected", async () => {
    const { changeJobStatus } = await import("./jobs.service");

    mocks.getJobStatuses.mockResolvedValue(
      new Map([
        ["job_1", "new"],
        ["job_2", "shortlisted"],
      ]),
    );
    // job_2 was already shortlisted, so the update skipped it.
    mocks.setJobsStatus.mockResolvedValue([{ id: "job_1", status: "shortlisted", title: "A" }]);

    const result = await changeJobStatus(db, userId, {
      jobIds: ["job_1", "job_2"],
      status: "shortlisted",
    });

    expect(result.updatedCount).toBe(1);
    const [, events] = mocks.insertJobEvents.mock.calls[0];
    expect(events).toHaveLength(1);
    expect(events[0].jobId).toBe("job_1");
  });

  it("attaches a note to the transition when one is given", async () => {
    const { changeJobStatus } = await import("./jobs.service");

    mocks.getJobStatuses.mockResolvedValue(new Map([["job_1", "new"]]));
    mocks.setJobsStatus.mockResolvedValue([{ id: "job_1", status: "dismissed", title: "A" }]);

    await changeJobStatus(db, userId, {
      jobIds: ["job_1"],
      status: "dismissed",
      note: "Wrong stack",
    });

    const [, events] = mocks.insertJobEvents.mock.calls[0];
    expect(events[0].body).toBe("Wrong stack");
  });

  it("passes the dismiss reason through to the row, not just the timeline", async () => {
    const { changeJobStatus } = await import("./jobs.service");

    mocks.getJobStatuses.mockResolvedValue(new Map([["job_1", "new"]]));
    mocks.setJobsStatus.mockResolvedValue([{ id: "job_1", status: "dismissed", title: "A" }]);

    await changeJobStatus(db, userId, {
      jobIds: ["job_1"],
      status: "dismissed",
      dismissReason: "wrong_stack",
    });

    // The column is what makes the answers countable later; the timeline is
    // what makes them readable. Both have to be written from one call.
    expect(mocks.setJobsStatus).toHaveBeenCalledWith(db, userId, ["job_1"], "dismissed", "wrong_stack");
  });

  it("writes the reason into the timeline in words", async () => {
    const { changeJobStatus } = await import("./jobs.service");

    mocks.getJobStatuses.mockResolvedValue(new Map([["job_1", "new"]]));
    mocks.setJobsStatus.mockResolvedValue([{ id: "job_1", status: "dismissed", title: "A" }]);

    await changeJobStatus(db, userId, {
      jobIds: ["job_1"],
      status: "dismissed",
      dismissReason: "wrong_seniority",
    });

    const [, events] = mocks.insertJobEvents.mock.calls[0];
    expect(events[0].body).toBe("Wrong seniority");
  });

  it("keeps both the reason and the note when there is one of each", async () => {
    const { changeJobStatus } = await import("./jobs.service");

    mocks.getJobStatuses.mockResolvedValue(new Map([["job_1", "new"]]));
    mocks.setJobsStatus.mockResolvedValue([{ id: "job_1", status: "dismissed", title: "A" }]);

    await changeJobStatus(db, userId, {
      jobIds: ["job_1"],
      status: "dismissed",
      dismissReason: "company",
      note: "Muted: Robert Half",
    });

    const [, events] = mocks.insertJobEvents.mock.calls[0];
    expect(events[0].body).toBe("Company — Muted: Robert Half");
  });

  it("ignores a reason on a status that is not dismissed", async () => {
    const { changeJobStatus } = await import("./jobs.service");

    // Nothing in the UI can send this, but the schema allows the pair — and a
    // shortlisted job whose history reads "wrong stack" would be nonsense.
    mocks.getJobStatuses.mockResolvedValue(new Map([["job_1", "new"]]));
    mocks.setJobsStatus.mockResolvedValue([{ id: "job_1", status: "shortlisted", title: "A" }]);

    await changeJobStatus(db, userId, {
      jobIds: ["job_1"],
      status: "shortlisted",
      dismissReason: "salary",
    });

    const [, events] = mocks.insertJobEvents.mock.calls[0];
    expect(events[0].body).toBeNull();
  });
  it("records a null from-status for a job it couldn't read beforehand", async () => {
    const { changeJobStatus } = await import("./jobs.service");

    // Possible if the row was created between the read and the update. Null is
    // the honest answer; inventing "new" would put a false transition in the log.
    mocks.getJobStatuses.mockResolvedValue(new Map());
    mocks.setJobsStatus.mockResolvedValue([{ id: "job_1", status: "applied", title: "A" }]);

    await changeJobStatus(db, userId, { jobIds: ["job_1"], status: "applied" });

    const [, events] = mocks.insertJobEvents.mock.calls[0];
    expect(events[0].fromStatus).toBeNull();
  });
});
