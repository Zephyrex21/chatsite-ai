import { describe, it, expect } from 'vitest';
import { resolveRateLimitIdentifier } from '@/lib/rate-limit/identifier';

describe('resolveRateLimitIdentifier', () => {
  it('prefers the user id when signed in', () => {
    const result = resolveRateLimitIdentifier({ userId: 'user-123', ip: '1.2.3.4' });
    expect(result).toBe('user:user-123');
  });

  it('falls back to IP when there is no user id', () => {
    const result = resolveRateLimitIdentifier({ userId: null, ip: '1.2.3.4' });
    expect(result).toBe('ip:1.2.3.4');
  });

  it('falls back to a fixed anonymous bucket when neither is available', () => {
    const result = resolveRateLimitIdentifier({ userId: undefined, ip: undefined });
    expect(result).toBe('anonymous');
  });

  it('treats an empty string userId as absent', () => {
    const result = resolveRateLimitIdentifier({ userId: '', ip: '1.2.3.4' });
    expect(result).toBe('ip:1.2.3.4');
  });
});
