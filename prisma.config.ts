// Prisma 7 moved the database connection URL out of schema.prisma and into
// this file. The Prisma CLI (migrate, studio, db push, etc.) reads the
// connection info from here — it no longer reads env("DATABASE_URL") out of
// the schema file directly.
//
// Docs: https://pris.ly/d/config-datasource
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// This project follows the Next.js convention of using .env.local rather
// than a plain .env file — load it explicitly so the Prisma CLI (which runs
// outside of Next.js and doesn't know that convention) can see DATABASE_URL.
loadEnv({ path: '.env.local' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
