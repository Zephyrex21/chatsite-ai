const { spawnSync } = require('node:child_process');

/**
 * Runs `prisma generate` automatically after every npm install/ci, so the
 * generated client can never silently go stale again (exactly the bug
 * this script exists to prevent — a fresh `npm install` clears Prisma's
 * generated output, which only `prisma generate` recreates).
 *
 * Deliberately never fails the overall install: a fresh clone won't have
 * DATABASE_URL set until .env.local exists, and some sandboxed/CI
 * environments can't reach Prisma's engine-binary CDN at all. Either of
 * those would otherwise turn a harmless "not ready yet" moment into a
 * broken `npm install` for everyone on the project.
 */
const result = spawnSync('npx', ['prisma', 'generate'], {
  stdio: 'inherit',
  shell: true,
});

if (result.status !== 0) {
  console.warn(
    '\n[postinstall] `prisma generate` did not complete — this is expected if ' +
      ".env.local (and DATABASE_URL) isn't set up yet, or if this environment " +
      "can't reach Prisma's engine downloads. Run `npx prisma generate` " +
      'manually once your database is configured.\n',
  );
}

// Always succeed, regardless of the above — see the comment block for why.
process.exit(0);
