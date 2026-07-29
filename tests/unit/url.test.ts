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
