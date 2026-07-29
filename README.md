# ChatSite — Chat With Any Website

Paste a URL, get a grounded AI chat about that page's actual content.
Built as a portfolio-grade project — not a demo, a production-shaped app.

**Status:** Phase 0 + 1 complete (Architecture & DevEx Foundation). No
user-facing features yet — see [Roadmap](#roadmap) below.

---

## Tech stack

Next.js 16 (App Router, TypeScript strict) - Tailwind CSS 4 - PostgreSQL +
Prisma - Firecrawl API - Google Gemini - Upstash Redis - NextAuth.js -
Vitest + Playwright - GitHub Actions

See [`docs/adr-0001-tech-stack.md`](docs/adr-0001-tech-stack.md) for the
reasoning behind each choice, and [`docs/architecture.md`](docs/architecture.md)
for the system diagram and layer responsibilities.

---

## Getting started

### Prerequisites

- Node.js 20+ and npm
- A PostgreSQL database — [Neon](https://neon.tech) or [Supabase](https://supabase.com)
  both have workable free tiers and take under 2 minutes to spin up
- (Later phases) API keys for Firecrawl, Gemini, Upstash Redis, and OAuth
  apps — not required yet, see [Roadmap](#roadmap)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the env template and fill in DATABASE_URL at minimum
cp .env.example .env.local

# 3. Generate the Prisma client
npx prisma generate

# 4. Push the schema to your database (creates tables, no data loss risk,
#    this is a brand-new schema)
npx prisma migrate dev --name init

# 5. Run the dev server
npm run dev
```

> **Note on Prisma version:** this project uses **Prisma 7**, which changed
> how the database connection URL is configured — it now lives in
> `prisma.config.ts` at the project root, not inside `schema.prisma` (a
> breaking change from Prisma 6 and earlier, which is what most tutorials
> online still show). You don't need to do anything differently — just
> make sure `DATABASE_URL` is set in `.env.local` as shown above, and both
> `prisma generate` and `prisma migrate dev` will pick it up automatically
> via `prisma.config.ts`. If you ever see an error mentioning
> `schema.prisma:11` and `url is no longer supported`, it means something
> re-added a `url = env(...)` line directly into `schema.prisma` — remove
> it, the URL belongs in `prisma.config.ts` only.

Visit `http://localhost:3000` — you should see a minimal placeholder page
confirming the foundation is wired up correctly.

### Running tests

```bash
npm run test              # run the full unit/integration suite once
npm run test:watch        # watch mode while developing
npm run test:coverage     # run with coverage report (output in /coverage)
```

Current test coverage: the URL validation utility
(`src/lib/validation/url.ts`) — includes SSRF-protection test cases
(rejects localhost, private IP ranges, the cloud metadata endpoint range).

### Full verification (what CI runs)

```bash
npm run verify
```

Runs lint, typecheck, format check, then tests, in that order. This is the
same gate that runs on every pull request via GitHub Actions
(`.github/workflows/ci.yml`).

### Other useful scripts

| Script                            | Purpose                                    |
| --------------------------------- | ------------------------------------------ |
| `npm run build`                   | Production build                           |
| `npm run lint`                    | ESLint                                     |
| `npm run typecheck`               | `tsc --noEmit`                             |
| `npm run format` / `format:check` | Prettier write / check                     |
| `npm run db:studio`               | Open Prisma Studio to browse your local DB |

A pre-commit hook (Husky + lint-staged) automatically lints and formats
staged files before every commit.

---

## Project structure

```
src/
  app/                 → routes & pages (thin, no business logic)
  lib/
    services/          → business logic, framework-agnostic, unit-testable
    repositories/      → database access (Prisma), isolated behind an interface
    ai/                 → Gemini client + prompt templates
    validation/         → input validation (e.g. SSRF-safe URL checks)
  components/
    ui/                 → design-system primitives (Button, Card, Input, ...)
    chat/                → feature-specific chat components
tests/
  unit/                 → Vitest, fast, no external calls
  integration/          → Vitest + MSW, mocked external APIs
  e2e/                   → Playwright (added in Phase 9)
docs/
  adr-0001-tech-stack.md → why each major tech choice was made
  architecture.md         → system diagram + layer responsibilities
prisma/
  schema.prisma          → User, ScrapedSite, ChatSession, Message models
```

---

## Roadmap

This project is being built in explicit, documented phases rather than all
at once — each phase ships as a working, tested increment.

- [x] **Phase 0 — Architecture & Planning**: ADRs, system diagram, DB schema, repo structure
- [x] **Phase 1 — DevEx & CI Foundation**: lint/format/typecheck gate, Husky, GitHub Actions CI
- [ ] **Phase 2 — Core Scrape Service**: Firecrawl integration, caching, SSRF-safe validation
- [ ] **Phase 3 — AI Chat Service**: Gemini integration, streaming, prompt-injection resistant grounding
- [ ] **Phase 4 — Auth & Multi-User**: NextAuth, guest mode, per-user rate limiting
- [ ] **Phase 5 — Claymorphic UI**: full design system, component library, accessibility pass
- [ ] **Phase 6 — Feature Depth**: full-site crawl, session history, export, shareable links
- [ ] **Phase 7 — Security Hardening**: dependency audit, abuse-case testing
- [ ] **Phase 8 — Observability**: Sentry, structured logging, analytics
- [ ] **Phase 9 — Testing Consolidation**: Playwright E2E, accessibility regression checks
- [ ] **Phase 10 — Documentation & Presentation**: demo video, case-study write-up

---

## A known, non-actionable audit note

`npm audit` currently flags 3 high-severity advisories in `postcss` and
`sharp`, both **nested inside Next.js's own dependency tree**, not
top-level dependencies of this project. The only "fix" npm offers is
downgrading to `next@9`, which would be a massive regression. This is
being tracked, not ignored, it'll resolve itself once Next.js ships an
update with patched nested deps, and is worth re-checking with `npm audit`
before each production deploy.
