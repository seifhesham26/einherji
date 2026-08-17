// A small pool of genuine current Chrome UA strings. Rotating within a realistic
// set matters more than the size of the pool — a UA that doesn't match its
// accompanying Sec-CH-UA headers is a stronger bot signal than a plain default.
const USER_AGENTS = [
  {
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    secChUa: `"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"`,
    secChUaPlatform: `"Windows"`,
  },
  {
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    secChUa: `"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"`,
    secChUaPlatform: `"macOS"`,
  },
  {
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    secChUa: `"Google Chrome";v="130", "Chromium";v="130", "Not_A Brand";v="24"`,
    secChUaPlatform: `"Linux"`,
  },
];

export interface RequestHeaderOptions {
  accept?: string;
  referer?: string;
  bearerToken?: string;
  // Credentialed APIs want to be identified honestly, not disguised as a browser —
  // Reddit in particular rejects generic browser user agents on its OAuth API.
  identifyAsApp?: boolean;
}

export const APP_USER_AGENT = "einherji-job-hunter/1.0";

export function buildRequestHeaders(options: RequestHeaderOptions = {}): Record<string, string> {
  const profile = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const headers: Record<string, string> = {
    "User-Agent": options.identifyAsApp || options.bearerToken
      ? APP_USER_AGENT
      : profile.userAgent,
    Accept: options.accept ?? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Ch-Ua": profile.secChUa,
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": profile.secChUaPlatform,
    "Upgrade-Insecure-Requests": "1",
  };

  if (options.referer) headers.Referer = options.referer;
  if (options.bearerToken) headers.Authorization = `Bearer ${options.bearerToken}`;

  return headers;
}

export const JSON_ACCEPT_HEADER = "application/json, text/plain, */*";
