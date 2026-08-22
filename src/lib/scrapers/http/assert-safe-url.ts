import { lookup } from "node:dns/promises";

/**
 * Guards server-side fetches whose URL came from a user.
 *
 * The careers URL on a tracked company is typed in by hand and then fetched by
 * the ATS detector, which makes it a textbook SSRF hole: `http://169.254.169.254`
 * reaches the cloud metadata service, `http://localhost:5432` reaches the
 * database, and `file:///etc/passwd` doesn't even need the network. Zod's `.url()`
 * accepts all three — it only checks that the string parses.
 *
 * Hostnames are resolved before the verdict, because `internal.example.com` can
 * point at 10.0.0.1 while looking perfectly public.
 */

import { redactUrl } from "./redact-url";

export class UnsafeUrlError extends Error {
  readonly url: string;

  constructor(url: string, reason: string) {
    // Redacted for the same reason ScrapeError is: this message ends up in the
    // run history the user can read.
    super(`Refusing to fetch ${redactUrl(url)}: ${reason}`);
    this.name = "UnsafeUrlError";
    this.url = redactUrl(url);
  }
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// Every IPv4 range that is not a routable public address. 169.254.0.0/16 is the
// one that matters most — AWS, GCP and Azure all serve instance credentials from
// 169.254.169.254.
const BLOCKED_IPV4_RANGES: { base: string; maskBits: number; label: string }[] = [
  { base: "0.0.0.0", maskBits: 8, label: "this network" },
  { base: "10.0.0.0", maskBits: 8, label: "private network" },
  { base: "100.64.0.0", maskBits: 10, label: "carrier-grade NAT" },
  { base: "127.0.0.0", maskBits: 8, label: "loopback" },
  { base: "169.254.0.0", maskBits: 16, label: "link-local / cloud metadata" },
  { base: "172.16.0.0", maskBits: 12, label: "private network" },
  { base: "192.0.0.0", maskBits: 24, label: "IETF protocol assignments" },
  { base: "192.168.0.0", maskBits: 16, label: "private network" },
  { base: "198.18.0.0", maskBits: 15, label: "benchmarking range" },
  { base: "224.0.0.0", maskBits: 4, label: "multicast" },
  { base: "240.0.0.0", maskBits: 4, label: "reserved" },
];

function ipv4ToInteger(address: string): number | null {
  const octets = address.split(".");
  if (octets.length !== 4) return null;

  let value = 0;
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return null;
    const parsed = Number(octet);
    if (parsed > 255) return null;
    value = value * 256 + parsed;
  }
  return value;
}

function blockedIpv4Reason(address: string): string | null {
  const value = ipv4ToInteger(address);
  if (value === null) return null;

  for (const range of BLOCKED_IPV4_RANGES) {
    const base = ipv4ToInteger(range.base);
    if (base === null) continue;
    // A /0 mask would shift by 32, which is a no-op in JS — not a case we have.
    const mask = range.maskBits === 0 ? 0 : (0xffffffff << (32 - range.maskBits)) >>> 0;
    if ((value & mask) >>> 0 === (base & mask) >>> 0) return range.label;
  }
  return null;
}

/**
 * Expands an IPv6 address to its eight 16-bit groups.
 *
 * Matching on the text would be wrong: `new URL()` rewrites `::ffff:127.0.0.1`
 * as `::ffff:7f00:1`, so a guard looking for a dotted quad sees a novel address
 * and waves loopback straight through.
 */
function expandIpv6(address: string): number[] | null {
  const halves = address.split("::");
  if (halves.length > 2) return null;

  // A trailing dotted quad ("::ffff:127.0.0.1") occupies the final two groups.
  let tailText = halves[halves.length - 1];
  const embeddedIpv4 = tailText.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (embeddedIpv4) {
    const asInteger = ipv4ToInteger(embeddedIpv4[1]);
    if (asInteger === null) return null;
    const high = (asInteger >>> 16).toString(16);
    const low = (asInteger & 0xffff).toString(16);
    tailText = tailText.slice(0, -embeddedIpv4[1].length) + `${high}:${low}`;
    if (halves.length === 2) halves[1] = tailText;
    else halves[0] = tailText;
  }

  const toGroups = (part: string): number[] | null => {
    if (!part) return [];
    const groups: number[] = [];
    for (const chunk of part.split(":")) {
      if (!/^[0-9a-f]{1,4}$/i.test(chunk)) return null;
      groups.push(parseInt(chunk, 16));
    }
    return groups;
  };

  const head = toGroups(halves[0]);
  const tail = halves.length === 2 ? toGroups(halves[1]) : [];
  if (!head || !tail) return null;

  if (halves.length === 1) return head.length === 8 ? head : null;

  const gap = 8 - head.length - tail.length;
  if (gap < 0) return null;
  return [...head, ...Array(gap).fill(0), ...tail];
}

function blockedIpv6Reason(address: string): string | null {
  // Strip any zone index ("fe80::1%eth0").
  const groups = expandIpv6(address.toLowerCase().split("%")[0]);
  if (!groups) return null;

  // IPv4-mapped (::ffff:0:0/96) and IPv4-compatible (::/96) both carry a real
  // IPv4 address in the low 32 bits, and it's that address the packet reaches.
  const firstFiveAreZero = groups.slice(0, 5).every((group) => group === 0);
  if (firstFiveAreZero && (groups[5] === 0xffff || groups[5] === 0)) {
    const embedded = (groups[6] << 16) | groups[7];
    // ::1 is loopback rather than an embedded 0.0.0.1.
    if (embedded === 1 && groups[5] === 0) return "loopback";
    if (embedded !== 0) return blockedIpv4Reason(integerToIpv4(embedded)) ?? null;
    return "unspecified";
  }

  if (groups[0] >= 0xfc00 && groups[0] <= 0xfdff) return "unique local address";
  if (groups[0] >= 0xfe80 && groups[0] <= 0xfebf) return "link-local";
  if (groups[0] >= 0xff00) return "multicast";

  return null;
}

function integerToIpv4(value: number): string {
  const unsigned = value >>> 0;
  return [unsigned >>> 24, (unsigned >>> 16) & 255, (unsigned >>> 8) & 255, unsigned & 255].join(
    ".",
  );
}

function blockedAddressReason(address: string, family: number): string | null {
  return family === 4 ? blockedIpv4Reason(address) : blockedIpv6Reason(address);
}

/**
 * Throws unless `rawUrl` is a public http(s) address safe to fetch server-side.
 *
 * Resolution is part of the check, so this must be re-run for every redirect hop —
 * a public URL that 302s to 169.254.169.254 is the standard way around a
 * validate-once guard.
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(rawUrl, "not a valid URL");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UnsafeUrlError(rawUrl, `unsupported scheme "${url.protocol}"`);
  }

  // Credentials in the URL are never right for a job board, and they're a common
  // way to smuggle a different host past a naive parser.
  if (url.username || url.password) {
    throw new UnsafeUrlError(rawUrl, "URLs with embedded credentials are not allowed");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!hostname) throw new UnsafeUrlError(rawUrl, "missing host");

  // A literal IP needs no DNS round trip, and must not get one — resolving it
  // would just hand back the same address.
  const literalReason =
    blockedIpv4Reason(hostname) ?? (hostname.includes(":") ? blockedIpv6Reason(hostname) : null);
  if (literalReason) {
    throw new UnsafeUrlError(rawUrl, `${hostname} is a ${literalReason} address`);
  }
  if (ipv4ToInteger(hostname) !== null || hostname.includes(":")) return url;

  let addresses: { address: string; family: number }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new UnsafeUrlError(rawUrl, `could not resolve ${hostname}`);
  }

  if (addresses.length === 0) throw new UnsafeUrlError(rawUrl, `${hostname} resolved to nothing`);

  // Every answer has to be safe. A host that returns one public and one private
  // address would otherwise be a coin flip decided by resolver ordering.
  for (const { address, family } of addresses) {
    const reason = blockedAddressReason(address, family);
    if (reason) {
      throw new UnsafeUrlError(rawUrl, `${hostname} resolves to a ${reason} address (${address})`);
    }
  }

  return url;
}
