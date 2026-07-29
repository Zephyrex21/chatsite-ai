/**
 * URL validation & normalization utilities.
 *
 * Used before any user-submitted URL is passed to Firecrawl (Phase 2) so we
 * never let the server make requests to internal/private network ranges
 * (SSRF protection) and so identical URLs hit the cache instead of the API.
 */

const BLOCKED_HOSTNAMES = new Set(['localhost', '0.0.0.0', '[::1]']);

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

export type UrlValidationResult =
  { valid: true; normalized: string } | { valid: false; reason: string };

/**
 * Validates that a string is a well-formed, public, http(s) URL that is
 * safe to pass to a server-side fetch/scrape call.
 */
export function validatePublicUrl(input: string): UrlValidationResult {
  let parsed: URL;

  try {
    parsed = new URL(input.trim());
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
