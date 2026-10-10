import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { memoryAdapter } from "better-auth/adapters/memory";
import { hashPassword, verifyPassword } from "better-auth/crypto";

const mocks = vi.hoisted(() => ({
  store: { user: [] as Record<string, unknown>[], account: [] as Record<string, unknown>[], session: [] as Record<string, unknown>[], verification: [] as Record<string, unknown>[] },
  send: vi.fn(),
  tasks: [] as (() => Promise<void>)[],
  env: {
    BETTER_AUTH_SECRET: "unit-test-secret-at-least-thirty-two-characters",
    BETTER_AUTH_URL: "http://localhost:3000", NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    RESEND_API_KEY: "fake-mail-key" as string | undefined,
    RESEND_FROM_EMAIL: "Einherji <mail@unit.invalid>" as string | undefined,
  },
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/env", () => ({ env: mocks.env }));
vi.mock("better-auth/adapters/drizzle", () => ({ drizzleAdapter: () => memoryAdapter(mocks.store) }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock("next/server", () => ({ after: (task: () => Promise<void>) => { mocks.tasks.push(task); } }));
import { auth } from "./auth";

beforeEach(async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.env.RESEND_API_KEY = "fake-mail-key";
  mocks.env.RESEND_FROM_EMAIL = "Einherji <mail@unit.invalid>";
  mocks.send.mockReset().mockResolvedValue({ data: { id: "fake-mail" }, error: null });
  mocks.tasks.splice(0);
  const now = new Date();
  mocks.store.user.splice(0, Infinity, { id: "recovery-user", name: "<script>unsafe name</script>", email: "recovery@unit.invalid", emailVerified: true, createdAt: now, updatedAt: now });
  mocks.store.account.splice(0, Infinity, { id: "recovery-account", userId: "recovery-user", accountId: "recovery-user", providerId: "credential", password: await hashPassword("Old-password-123"), createdAt: now, updatedAt: now });
  mocks.store.session.splice(0, Infinity, { id: "recovery-session", userId: "recovery-user", token: "old-session", expiresAt: new Date(Date.now() + 86_400_000), createdAt: now, updatedAt: now });
  mocks.store.verification.splice(0);
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

async function request(email = "recovery@unit.invalid") {
  const result = await auth.api.requestPasswordReset({ body: { email, redirectTo: "http://localhost:3000/login/reset-password" } });
  await Promise.all(mocks.tasks.splice(0).map((task) => task()));
  return result;
}
function sentToken(): string {
  const text = mocks.send.mock.calls[0][0].text as string;
  const link = new URL(text.split("\n").find((line) => line.startsWith("http"))!);
  return link.pathname.split("/").at(-1)!;
}

describe("configured Better Auth recovery", () => {
  it("schedules delivery after the generic response instead of awaiting the mail provider", async () => {
    const result = await auth.api.requestPasswordReset({ body: { email: "recovery@unit.invalid", redirectTo: "/login/reset-password" } });
    expect(result.status).toBe(true);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.tasks).toHaveLength(1);
    await mocks.tasks.pop()!();
    expect(mocks.send).toHaveBeenCalledOnce();
  });
  it("uses one-time tokens and revokes existing sessions after a valid reset", async () => {
    await request();
    expect(mocks.send).toHaveBeenCalledOnce();
    const token = sentToken();
    await expect(auth.api.resetPassword({ body: { token, newPassword: "New-password-123" } })).resolves.toEqual({ status: true });
    expect(mocks.store.session).toHaveLength(0);
    expect(await verifyPassword({ hash: mocks.store.account[0].password as string, password: "New-password-123" })).toBe(true);
    await expect(auth.api.resetPassword({ body: { token, newPassword: "Another-password-123" } })).rejects.toThrow();
  });

  it("does not reveal whether an email has an account", async () => {
    const known = await request();
    const unknown = await request("nobody@unit.invalid");
    expect(unknown).toEqual(known);
    expect(mocks.send).toHaveBeenCalledOnce();
  });

  it("rejects expired reset tokens without changing credentials", async () => {
    await request();
    const token = sentToken();
    mocks.store.verification[0].expiresAt = new Date(Date.now() - 1);
    const original = mocks.store.account[0].password;
    await expect(auth.api.resetPassword({ body: { token, newPassword: "New-password-123" } })).rejects.toThrow();
    expect(mocks.store.account[0].password).toBe(original);
  });

  it("rejects recovery for all addresses before lookup when production mail is missing", async () => {
    mocks.env.RESEND_API_KEY = undefined;
    for (const email of ["recovery@unit.invalid", "nobody@unit.invalid"]) {
      await expect(request(email)).rejects.toMatchObject({ statusCode: 503 });
    }
    expect(mocks.send).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
    expect(mocks.store.verification).toHaveLength(0);
  });

  it("keeps delivery failures generic and never logs tokens or account email", async () => {
    mocks.send.mockResolvedValue({ data: null, error: { message: "private upstream details" } });
    const known = await request();
    const unknown = await request("nobody@unit.invalid");
    expect(known).toEqual(unknown);
    expect(console.error).toHaveBeenCalledWith("Password recovery email delivery failed.");
    expect(console.log).not.toHaveBeenCalled();
  });

  it("escapes user content in mail HTML", async () => {
    await request();
    expect(mocks.send.mock.calls[0][0].html).not.toContain("<script>");
    expect(mocks.send.mock.calls[0][0].html).toContain("&lt;script&gt;");
  });

  it("does not reopen public registration", async () => {
    await expect(auth.api.signUpEmail({ body: { name: "New", email: "new@unit.invalid", password: "New-password-123" } })).rejects.toThrow();
    expect(mocks.store.user).toHaveLength(1);
  });

  it("rejects an untrusted recovery destination without sending a token", async () => {
    const response = await auth.handler(new Request("http://localhost:3000/api/auth/request-password-reset", {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email: "recovery@unit.invalid", redirectTo: "https://attacker.invalid/reset" }),
    }));
    expect(response.status).toBe(403);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.store.verification).toHaveLength(0);
  });

  it("never falls back to token logging for production verification", async () => {
    mocks.env.RESEND_FROM_EMAIL = undefined;
    await expect(auth.api.sendVerificationEmail({ body: { email: "recovery@unit.invalid" } })).rejects.toMatchObject({ statusCode: 503 });
    expect(console.log).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });
});
