/**
 * URL validation & normalization utilities.
 *
 * Used before any user-submitted URL is passed to Firecrawl (Phase 2) so we
 * never let the server make requests to internal/private network ranges
 * (SSRF protection) and so identical URLs hit the cache instead of the API.
 *
 * Note on threat model: Firecrawl's own infrastructure — not this server —
 * makes the actual outbound request to the submitted URL, so this check is
 * primarily defense-in-depth (protecting this server from ever connecting
 * to its own internal network in some future direct-fetch code path) and a
 * cost/abuse guard (no point spending a Firecrawl credit on an obviously
 * invalid target). Firecrawl, as a scraping provider, is expected to run
 * its own SSRF protections against the sites it actually connects to.
 */

const MAX_URL_LENGTH = 2048;

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0']);

// Private / reserved IPv4 ranges we refuse to let the scraper reach.
const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local / cloud metadata endpoint range
];

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  const [a, b, c, d] = parts as [number, number, number, number];
  return (a << 24) + (b << 16) + (c << 8) + d;
}

function isPrivateIPv4(hostname: string): boolean {
  const ip = ipToInt(hostname);
  if (ip === null) return false;

  return PRIVATE_IPV4_RANGES.some(([base, maskBits]) => {
    const baseInt = ipToInt(base);
    if (baseInt === null) return false;
    const mask = maskBits === 0 ? 0 : (~0 << (32 - maskBits)) >>> 0;
    return (ip & mask) === (baseInt & mask);
  });
}

/**
 * Checks an IPv6 literal hostname (as returned by URL.hostname, brackets
 * included — e.g. "[::1]") against private/special ranges, including
 * IPv4-mapped IPv6 addresses (::ffff:127.0.0.1 and its canonical
 * ::ffff:7f00:1 hex-group form) that would otherwise smuggle a blocked
 * IPv4 target past a check that only looks at plain dotted-decimal.
 */
function isPrivateOrSpecialIPv6(hostname: string): boolean {
  if (!hostname.startsWith('[') || !hostname.endsWith(']')) return false;
  const addr = hostname.slice(1, -1).toLowerCase();

  if (addr === '::1' || addr === '::') return true; // loopback / unspecified

  const firstGroup = addr.split(':')[0] ?? '';
  if (/^f[cd][0-9a-f]{0,2}$/.test(firstGroup)) return true; // fc00::/7 unique-local
  if (/^fe[89ab][0-9a-f]?$/.test(firstGroup)) return true; // fe80::/10 link-local

  const mapped = addr.match(/^::ffff:(.+)$/)?.[1];
  if (mapped) {
    if (mapped.includes('.')) {
      return isPrivateIPv4(mapped); // dotted form: ::ffff:127.0.0.1
    }
    const hexGroups = mapped.split(':');
    if (hexGroups.length === 2) {
      const hi = parseInt(hexGroups[0] ?? '', 16);
      const lo = parseInt(hexGroups[1] ?? '', 16);
      if (!Number.isNaN(hi) && !Number.isNaN(lo)) {
        const dotted = [(hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff].join('.');
        return isPrivateIPv4(dotted); // hex-group form: ::ffff:7f00:1
      }
    }
  }

  return false;
}

export type UrlValidationResult =
  { valid: true; normalized: string } | { valid: false; reason: string };

/**
 * Validates that a string is a well-formed, public, http(s) URL that is
 * safe to pass to a server-side fetch/scrape call.
 */
export function validatePublicUrl(input: string): UrlValidationResult {
  const trimmed = input.trim();

  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, reason: `URL is too long (max ${MAX_URL_LENGTH} characters).` };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Not a valid URL.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Only http and https URLs are supported.' };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, reason: 'Requests to local/internal hosts are not allowed.' };
  }

  if (hostname.endsWith('.local')) {
    return { valid: false, reason: 'Requests to local/internal hosts are not allowed.' };
  }

  if (isPrivateIPv4(hostname)) {
    return { valid: false, reason: 'Requests to private IP ranges are not allowed.' };
  }

  if (isPrivateOrSpecialIPv6(hostname)) {
    return { valid: false, reason: 'Requests to private IP ranges are not allowed.' };
  }

  return { valid: true, normalized: normalizeUrl(parsed) };
}

/**
 * Normalizes a URL for cache-key purposes: strips common tracking params,
 * removes trailing slashes and hash fragments, lowercases the host.
 */
export function normalizeUrl(input: string | URL): string {
  const url = typeof input === 'string' ? new URL(input) : new URL(input.toString());

  const trackingParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'fbclid',
    'gclid',
  ];
  trackingParams.forEach((param) => url.searchParams.delete(param));

  url.hostname = url.hostname.toLowerCase();
  url.hash = '';

  let result = url.toString();
  if (result.endsWith('/') && url.pathname !== '/') {
    result = result.slice(0, -1);
  }

  return result;
}
