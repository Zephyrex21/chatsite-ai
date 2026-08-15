/**
 * Appends `uselibpqcompat=true` to a `?sslmode=prefer|require|verify-ca`
 * connection string. `pg`/`pg-connection-string` currently treats those
 * three modes as aliases for `verify-full` and logs a `console.error`-level
 * deprecation warning on every single connection about that behavior
 * changing in a future major version. `uselibpqcompat=true` is the fix the
 * warning itself recommends for keeping *today's* behavior explicit — this
 * makes that choice up front rather than silently accepting whatever the
 * next `pg` major version's default becomes, and stops treating a routine
 * startup notice as an application error on every request.
 *
 * A connection string with no `sslmode` (e.g. a local, SSL-less dev
 * Postgres) is returned unchanged — there's nothing to silence there, and
 * appending an unrelated query param to an otherwise-working local URL
 * isn't worth the risk for zero benefit.
 *
 * Kept in its own file, separate from db.ts, so this pure string-in/
 * string-out logic can be unit-tested without importing a module that
 * constructs a real Prisma/pg connection pool as a side effect of import.
 */
export function withLibpqCompat(connectionString: string | undefined): string | undefined {
  if (!connectionString) return connectionString;

  try {
    const url = new URL(connectionString);
    const sslmode = url.searchParams.get('sslmode');
    const affectedModes = ['prefer', 'require', 'verify-ca'];
    if (sslmode && affectedModes.includes(sslmode) && !url.searchParams.has('uselibpqcompat')) {
      url.searchParams.set('uselibpqcompat', 'true');
      return url.toString();
    }
  } catch {
    // Malformed URL — let PrismaPg/pg surface their own connection error
    // rather than this function masking it with a different one.
  }
  return connectionString;
}
