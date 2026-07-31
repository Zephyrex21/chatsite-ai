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

**Note on model choice and SDK:** uses `@google/genai` (the current unified
SDK — the older `@google/generative-ai` package is deprecated). Model
choice: `gemini-2.5-flash` as primary, `gemini-3.5-flash` as fallback. This
was a deliberate choice of the _proven_ 2.5 generation for the primary
call rather than the newer 3.x family — Gemini 3.x has iterated fast
(several preview models shipped and were deprecated within weeks in mid-
2026), which is exactly the kind of churn a primary/critical-path call
shouldn't be exposed to. The stronger, newer 3.5 model is used only as the
fallback, where its extra capability is more valuable than its shorter
track record. Both model names are defined as single constants in
`gemini-client.ts` — swapping either is a one-line change.

**Note on testing strategy:** `ChatService` (the orchestration logic —
prompt grounding, history building, persistence) is unit-tested against a
fake `AiClient`, achieving 94%+ coverage. `GeminiClient` itself (the direct
SDK wrapper) is deliberately _not_ covered by an automated test — mocking
the Gemini SDK's internal transport convincingly would mean writing
assertions against my own assumptions of its wire format rather than
verified reality, which is worse than no test at all. It's verified
instead via a manual smoke test against the real API (see README). This
mirrors the same reasoning already applied to the Prisma repository layer.

### Auth.js v5 with JWT sessions, adapter used only for user persistence

**Decision:** `next-auth@beta` (Auth.js v5) with `@auth/prisma-adapter`,
GitHub + Google OAuth providers, and `session: { strategy: 'jwt' }`
explicitly forced.

**Why JWT over database sessions:** database sessions add a Prisma query
to every authenticated request and can't run outside the Node.js runtime.
Neither is a real constraint at this project's traffic level, but there's
no upside to paying that cost for no benefit — JWT sessions verify from an
encrypted cookie with zero database round-trip. The trade-off (can't
invalidate a single session early, e.g. on a suspected account compromise,
without waiting for the JWT to expire) is acceptable here; it wouldn't be
for a project with stricter session-revocation requirements.

**Why the adapter is still used despite JWT sessions:** JWT alone doesn't
give you a `users` table to query — "per-user session history" needs real
User/Account rows to link ChatSessions to. The adapter persists those on
sign-in; the JWT strategy just means _session verification_ doesn't touch
the database, not that _user data_ doesn't.

**Why auth checks live in route handlers, not middleware/proxy.ts:**
Next.js 16 renamed `middleware.ts` to `proxy.ts` specifically to make the
network boundary explicit, and the framework's own guidance is now that
`proxy.ts` should handle routing concerns only (redirects, rewrites) —
_not_ authentication. This followed a real vulnerability
(CVE-2025-29927) where middleware-based auth could be bypassed under
certain conditions due to Edge Runtime limitations. This project checks
`auth()` directly inside each route handler that needs it instead —
slightly more repetition across handlers, but no shared "trust the
middleware already checked this" assumption that could silently break if
a route is added without updating a central matcher config.

**Note on env var names:** Auth.js v5's canonical variable names changed
from v4 (`AUTH_SECRET` instead of `NEXTAUTH_SECRET`, `AUTH_GITHUB_ID`
instead of `GITHUB_ID`, etc.) — most existing tutorials and Stack Overflow
answers still show the old names. Both work (v4 names are kept for
backward compatibility), but `.env.example` uses the canonical v5 names.

**Note on the Prisma schema:** Auth.js's Prisma adapter expects models
named exactly `Account`, `Session`, and `VerificationToken`. This
project already had a `ChatSession` model (application-level chat
threads, unrelated to authentication) before this phase, which
doesn't collide with Auth.js's own `Session` model — but `User.sessions`
_did_ originally point at `ChatSession[]`, which would have collided
with the relation name Auth.js's adapter expects. Renamed to
`User.chatSessions` to free up `sessions` for Auth.js's own relation.

### Claymorphism design tokens as CSS custom properties, not a JS theme file

**Decision:** all design tokens (colors, radii, shadows) live as CSS
custom properties in `globals.css`, using Tailwind v4's `@theme inline`
block and the `bg-(--my-token)` shorthand syntax to consume them —
deliberately not Tailwind v3-style config-file theming.

**Why:** Tailwind v4 moved theming into CSS itself; fighting that by
reaching for a `tailwind.config.js` color palette would mean maintaining
two sources of truth (the CSS variables dark-mode needs to swap, and a
parallel JS object). One token file, referenced everywhere, means a
color or shadow change never requires touching more than one place.

**Why CSS variables specifically enable dark mode cleanly:** the same
token _names_ (`--clay-bg`, `--clay-shadow-out`, etc.) resolve to
different values under `:root` vs `:root.dark` — every component
references the token, never a literal value, so no component needs its
own dark-mode conditional.

### Fonts self-hosted via npm (Fontsource) rather than next/font/google

**Decision:** `@fontsource-variable/fredoka` (display) and
`@fontsource-variable/plus-jakarta-sans` (body), imported directly in
`globals.css`, instead of `next/font/google`.

**Why:** this avoids a build-time network dependency on Google's font
CDN entirely — the font files ship as part of `node_modules` like any
other dependency. That's a genuine production benefit (one less external
service that can make your build flaky) independent of my own
environment's network restrictions, though it was also the only option
that let me verify the build actually succeeds before handing it over.

**Why these two typefaces specifically:** Fredoka's letterforms have
soft, rounded terminals — chosen because that visually rhymes with the
claymorphism aesthetic itself (soft, puffy, no hard edges), not picked as
a generic "friendly rounded font." Plus Jakarta Sans pairs with it
without competing, and stays fully readable at body-text sizes where a
display face wouldn't.

### No Storybook, no Lighthouse audit this phase

**Decision:** skipped both, despite being in the original Phase 5 plan.

**Why:** neither is honestly achievable without a real browser to verify
against. A Storybook config I can't visually confirm renders correctly,
or a Lighthouse score I can't actually run, would be worse than not
claiming them — the same principle already applied to not
mock-testing the Gemini SDK's wire format. What's verifiable without a
browser (semantic HTML, focus-visible states, aria-live regions, labeled
inputs, prefers-reduced-motion) is in place; a real accessibility and
visual QA pass by an actual person is a known, explicit gap, not a
silently skipped one.

## Consequences

- The service layer (`src/lib/services`, `src/lib/ai`, `src/lib/repositories`)
  must stay framework-agnostic and independently unit-testable — this is
  enforced by keeping Next.js imports out of that layer entirely.
- Any future service extraction (e.g. moving scraping to a background job
  queue) only requires changing what calls the service layer, not the
  service layer itself.
