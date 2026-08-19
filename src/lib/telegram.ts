const TELEGRAM_API_BASE = "https://api.telegram.org";

// Telegram rejects anything longer outright.
export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export class TelegramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramError";
  }
}

/**
 * Escapes text for Telegram's HTML parse mode.
 *
 * Telegram supports only a small tag subset — b, i, u, s, a, code, pre — and
 * rejects the whole message if it sees anything it can't parse. A stray "<" in a
 * job title from a third-party feed would fail the send, so every interpolated
 * value goes through here.
 */
export function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface TelegramCredentials {
  botToken: string;
  chatId: string;
}

/**
 * Sends one message.
 *
 * The token sits in the URL path, so it's encoded — a token containing a slash
 * would otherwise rewrite the path rather than fail cleanly.
 */
export async function sendTelegramMessage(
  credentials: TelegramCredentials,
  text: string,
): Promise<void> {
  const url = `${TELEGRAM_API_BASE}/bot${encodeURIComponent(credentials.botToken)}/sendMessage`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chatId,
        text: text.slice(0, TELEGRAM_MAX_MESSAGE_LENGTH),
        parse_mode: "HTML",
        // Job links would otherwise each expand into a preview card.
        disable_web_page_preview: true,
      }),
    });
  } catch (error) {
    throw new TelegramError(
      `Couldn't reach Telegram: ${error instanceof Error ? error.message : "network error"}`,
    );
  }

  if (response.ok) return;

  // Telegram explains refusals in the body, and those explanations are the
  // useful part — "chat not found" means the user never messaged the bot, which
  // is the single most common setup mistake.
  const detail = await response
    .json()
    .then((body: { description?: string }) => body.description)
    .catch(() => null);

  throw new TelegramError(detail ?? `Telegram returned ${response.status}.`);
}
