import { describe, it, expect } from 'vitest';
import { validatePublicUrl, normalizeUrl } from '@/lib/validation/url';

describe('validatePublicUrl', () => {
  it('accepts a normal https URL', () => {
    const result = validatePublicUrl('https://example.com/blog/post');
    expect(result.valid).toBe(true);
  });

  it('accepts a normal http URL', () => {
    const result = validatePublicUrl('http://example.com');
    expect(result.valid).toBe(true);
  });

  it('rejects malformed input', () => {
    const result = validatePublicUrl('not a url at all');
    expect(result.valid).toBe(false);
  });

  it('rejects non-http(s) protocols', () => {
    expect(validatePublicUrl('ftp://example.com').valid).toBe(false);
    expect(validatePublicUrl('file:///etc/passwd').valid).toBe(false);
    expect(validatePublicUrl('javascript:alert(1)').valid).toBe(false);
  });

  it('rejects localhost', () => {
    expect(validatePublicUrl('http://localhost:3000').valid).toBe(false);
    expect(validatePublicUrl('http://127.0.0.1').valid).toBe(false);
  });

  it('rejects private IPv4 ranges (SSRF protection)', () => {
    expect(validatePublicUrl('http://10.0.0.5/admin').valid).toBe(false);
    expect(validatePublicUrl('http://192.168.1.1').valid).toBe(false);
    expect(validatePublicUrl('http://172.16.0.1').valid).toBe(false);
  });

  it('rejects the cloud metadata endpoint range', () => {
    expect(validatePublicUrl('http://169.254.169.254/latest/meta-data').valid).toBe(false);
  });

  it('rejects .local hostnames', () => {
    expect(validatePublicUrl('http://myserver.local').valid).toBe(false);
  });

  it('rejects decimal, hex, and octal-encoded IPv4 loopback addresses', () => {
    // These get canonicalized to 127.0.0.1 by the URL parser itself before
    // our check ever runs — verifying that here rather than assuming it.
    expect(validatePublicUrl('http://2130706433/').valid).toBe(false); // decimal
    expect(validatePublicUrl('http://0x7f000001/').valid).toBe(false); // hex
    expect(validatePublicUrl('http://0177.0.0.1/').valid).toBe(false); // octal
    expect(validatePublicUrl('http://127.1/').valid).toBe(false); // shorthand
  });

  it('rejects IPv6 loopback and unspecified addresses', () => {
    expect(validatePublicUrl('http://[::1]/').valid).toBe(false);
    expect(validatePublicUrl('http://[::]/').valid).toBe(false);
  });

  it('rejects IPv6 link-local and unique-local ranges', () => {
    expect(validatePublicUrl('http://[fe80::1]/').valid).toBe(false);
    expect(validatePublicUrl('http://[fc00::1]/').valid).toBe(false);
    expect(validatePublicUrl('http://[fd12:3456::1]/').valid).toBe(false);
  });

  it('rejects IPv4-mapped IPv6 addresses that embed a private IPv4 target', () => {
    // Both the dotted form and the canonical hex-group form the URL parser
    // normalizes it to — this is a known real SSRF-filter bypass technique.
    expect(validatePublicUrl('http://[::ffff:127.0.0.1]/').valid).toBe(false);
    expect(validatePublicUrl('http://[::ffff:7f00:1]/').valid).toBe(false);
    expect(validatePublicUrl('http://[::ffff:10.0.0.5]/').valid).toBe(false);
  });

  it('does not over-block legitimate public IPv6 addresses', () => {
    expect(validatePublicUrl('http://[2001:4860:4860::8888]/').valid).toBe(true); // Google DNS
    expect(validatePublicUrl('http://[::ffff:8.8.8.8]/').valid).toBe(true); // public IPv4-mapped
  });

  it('rejects excessively long URLs', () => {
    const hugeUrl = 'http://' + 'a'.repeat(3000) + '.com/';
    expect(validatePublicUrl(hugeUrl).valid).toBe(false);
  });
});

describe('normalizeUrl', () => {
  it('strips known tracking params', () => {
    const result = normalizeUrl('https://example.com/page?utm_source=twitter&id=5');
    expect(result).toBe('https://example.com/page?id=5');
  });

  it('removes hash fragments', () => {
    const result = normalizeUrl('https://example.com/page#section-2');
    expect(result).toBe('https://example.com/page');
  });

  it('lowercases the hostname', () => {
    const result = normalizeUrl('https://Example.COM/Page');
    expect(result).toBe('https://example.com/Page');
  });

  it('strips trailing slashes (except root)', () => {
    expect(normalizeUrl('https://example.com/page/')).toBe('https://example.com/page');
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });
});
