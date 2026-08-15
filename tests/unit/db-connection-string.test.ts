import { describe, it, expect } from 'vitest';
import { withLibpqCompat } from '@/lib/repositories/db-connection-string';

describe('withLibpqCompat', () => {
  it('appends uselibpqcompat=true when sslmode=require is present', () => {
    const result = withLibpqCompat('postgresql://user:pass@host/db?sslmode=require');
    expect(result).toContain('sslmode=require');
    expect(result).toContain('uselibpqcompat=true');
  });

  it('appends uselibpqcompat=true when sslmode=prefer is present', () => {
    const result = withLibpqCompat('postgresql://user:pass@host/db?sslmode=prefer');
    expect(result).toContain('uselibpqcompat=true');
  });

  it('appends uselibpqcompat=true when sslmode=verify-ca is present', () => {
    const result = withLibpqCompat('postgresql://user:pass@host/db?sslmode=verify-ca');
    expect(result).toContain('uselibpqcompat=true');
  });

  it('does not touch a connection string with sslmode=verify-full (already unambiguous)', () => {
    const input = 'postgresql://user:pass@host/db?sslmode=verify-full';
    expect(withLibpqCompat(input)).toBe(input);
  });

  it('does not add uselibpqcompat when there is no sslmode at all', () => {
    const input = 'postgresql://user:pass@localhost/db';
    expect(withLibpqCompat(input)).toBe(input);
  });

  it('does not duplicate uselibpqcompat if already present', () => {
    const input = 'postgresql://user:pass@host/db?sslmode=require&uselibpqcompat=true';
    const result = withLibpqCompat(input);
    expect(result?.match(/uselibpqcompat/g)?.length).toBe(1);
  });

  it('preserves other query params and credentials untouched', () => {
    const result = withLibpqCompat('postgresql://user:pass@host/db?sslmode=require&pgbouncer=true');
    expect(result).toContain('pgbouncer=true');
    expect(result).toContain('user:pass@host');
  });

  it('returns undefined unchanged when the connection string is undefined', () => {
    expect(withLibpqCompat(undefined)).toBeUndefined();
  });

  it('returns an empty string unchanged', () => {
    expect(withLibpqCompat('')).toBe('');
  });

  it('returns a malformed URL unchanged rather than throwing', () => {
    const input = 'not a valid url at all ://???';
    expect(() => withLibpqCompat(input)).not.toThrow();
    expect(withLibpqCompat(input)).toBe(input);
  });
});
