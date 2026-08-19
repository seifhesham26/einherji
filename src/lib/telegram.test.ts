import { afterEach, describe, expect, it, vi } from "vitest";
import { escapeTelegramHtml, sendTelegramMessage, TelegramError } from "./telegram";

afterEach(() => vi.unstubAllGlobals());

type FetchCall = [string, RequestInit];

function stubFetch(response: Response) {
  const calls: FetchCall[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push([url, init]);
    return response;
  });
  return calls;
}

describe("escapeTelegramHtml", () => {
  // Telegram rejects the whole message if it meets a tag it can't parse, so an
  // unescaped "<" in a job title fails the send rather than looking odd.
  it("escapes the characters Telegram parses as markup", () => {
    expect(escapeTelegramHtml('<b>x</b> & "y"')).toBe('&lt;b&gt;x&lt;/b&gt; &amp; "y"');
  });
});

describe("sendTelegramMessage", () => {
  const credentials = { botToken: "123:ABC", chatId: "42" };

  it("posts to the bot's sendMessage endpoint", async () => {
    const calls = stubFetch(new Response("{}", { status: 200 }));

    await sendTelegramMessage(credentials, "hello");

    const [url, init] = calls[0];
    expect(url).toContain("/bot123%3AABC/sendMessage");
    expect(JSON.parse(init.body as string)).toMatchObject({
      chat_id: "42",
      text: "hello",
      parse_mode: "HTML",
    });
  });

  // The token sits in the URL path — unencoded, one containing a slash would
  // rewrite the path instead of failing cleanly.
  it("encodes the token rather than letting it alter the path", async () => {
    const calls = stubFetch(new Response("{}", { status: 200 }));

    await sendTelegramMessage({ botToken: "a/b", chatId: "1" }, "hi");

    expect(calls[0][0]).toContain("/bota%2Fb/sendMessage");
  });

  it("truncates rather than letting Telegram reject an over-long message", async () => {
    const calls = stubFetch(new Response("{}", { status: 200 }));

    await sendTelegramMessage(credentials, "x".repeat(5000));

    const body = JSON.parse(calls[0][1].body as string);
    expect(body.text.length).toBe(4096);
  });

  // Telegram's own wording is the useful part: "chat not found" tells the user
  // they never messaged the bot, which is the usual setup mistake.
  it("surfaces Telegram's explanation for a refusal", async () => {
    stubFetch(
      new Response(JSON.stringify({ ok: false, description: "chat not found" }), { status: 400 }),
    );

    await expect(sendTelegramMessage(credentials, "hi")).rejects.toThrow("chat not found");
  });

  it("falls back to the status code when there is no explanation", async () => {
    stubFetch(new Response("not json", { status: 500 }));

    await expect(sendTelegramMessage(credentials, "hi")).rejects.toThrow(/500/);
  });

  it("reports a network failure as a Telegram error rather than leaking it raw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("ECONNREFUSED"); }));

    await expect(sendTelegramMessage(credentials, "hi")).rejects.toBeInstanceOf(TelegramError);
  });
});
