/**
 * Resolves the identifier a rate limiter should key on: the signed-in
 * user's id when available (so one account can't get around a per-IP
 * limit by switching networks), otherwise the caller's IP.
 *
 * Kept in its own file, separate from the Redis/Ratelimit client
 * instances in ./client.ts, so this pure logic is importable in tests
 * without constructing a real Redis connection.
 */
export function resolveRateLimitIdentifier(params: {
  userId: string | null | undefined;
  ip: string | null | undefined;
}): string {
  if (params.userId) return `user:${params.userId}`;
  if (params.ip) return `ip:${params.ip}`;
  return 'anonymous';
}
