# ADR-0001: Core Tech Stack

**Status:** Accepted
**Date:** 2026-07-29

## Context

ChatSite ("chat with any website") needs a stack that supports: server-side
scraping of arbitrary URLs, an AI chat pipeline with streaming responses,
persistent multi-user sessions, and a distinctive, accessible UI — while
being defensible in a technical interview, not just fast to ship.

## Decisions

### Next.js (App Router) over separate frontend/backend

**Decision:** One Next.js app, using Route Handlers as the API layer.

**Why:** A solo-maintained portfolio project benefits more from a single
deploy target and no CORS configuration than from service separation. Route
Handlers are thin wrappers around a framework-agnostic service layer
(`src/lib/services`), so the separation of concerns a multi-service
architecture would give us is preserved — it's just not physically split
across repos/processes. If this needed to scale to a team or handle far more
traffic, extracting the AI/scraping logic into a separate service would be a
mechanical refactor, not a rewrite, since the service layer already has no
framework dependencies.

**Trade-off accepted:** less clean horizontal scaling of the API
independently of the frontend. Not a real constraint at this project's scale.

### PostgreSQL + Prisma over MongoDB

**Decision:** Relational Postgres via Prisma, not Mongo/Mongoose.

**Why:** The data model here — users, scraped sites, chat sessions, messages
— has real foreign-key relationships and benefits from relational
integrity (a message always belongs to exactly one session; a session
always belongs to exactly one scraped site). Prisma's migrations and
generated types also catch schema drift at compile time, which matters more
here than in a document-shaped app.

This is a deliberate contrast with an earlier MERN project (MindForge),
where Mongo's flexible schema suited freeform journal entries better. Using
Postgres here demonstrates picking the database to fit the data, not
defaulting to one tool for every project.

**Trade-off accepted:** an extra migration step in the deploy pipeline
(`prisma migrate deploy`) that a schemaless DB wouldn't need.

**Note on Prisma 7:** this project was started shortly after Prisma's v7
release, which changed the connection-URL configuration model. The URL now
lives in `prisma.config.ts`, not in `schema.prisma`'s `datasource` block,
and `PrismaClient` requires an explicit driver adapter (`@prisma/adapter-pg`)
rather than connecting with zero config. See `prisma.config.ts` and
`src/lib/repositories/db.ts` for the resulting setup. This is called out
explicitly because most existing Prisma tutorials/StackOverflow answers
still describe the pre-v7 pattern.

### Firecrawl over building a custom scraper

**Decision:** Use Firecrawl's hosted API rather than a self-built
Puppeteer/Playwright scraper.

**Why:** JS-rendering, anti-bot handling, and markdown conversion are
solved problems that would consume disproportionate time to rebuild well.
The scraper is wrapped behind an interface (`ScraperProvider`) in
`src/lib/services`, so swapping providers later is a contained change, not
a rewrite.

**Trade-off accepted:** dependency on a third-party API's uptime and free
tier limits — mitigated with caching and clear user-facing error states.

**Note on API version:** integrates against Firecrawl's `/v2/scrape`
endpoint specifically (verified against current docs at implementation
time, not assumed from training data — Firecrawl has iterated its API
surface significantly across versions). The request/response shape is
isolated entirely inside `FirecrawlProvider`, so if Firecrawl ships a v3,
updating is a change to one file, not a hunt through the codebase.

### Gemini with a fallback chain over a single fixed model

**Decision:** Primary model call to a fast Gemini model, with a fallback to
a stronger model on failure/timeout — the same pattern used in a prior
project's AI integration.

**Why:** Keeps typical response latency low while protecting against a
single model's transient failures degrading the whole product.

## Consequences

- The service layer (`src/lib/services`, `src/lib/ai`, `src/lib/repositories`)
  must stay framework-agnostic and independently unit-testable — this is
  enforced by keeping Next.js imports out of that layer entirely.
- Any future service extraction (e.g. moving scraping to a background job
  queue) only requires changing what calls the service layer, not the
  service layer itself.
