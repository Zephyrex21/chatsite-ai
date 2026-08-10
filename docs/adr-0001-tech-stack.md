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

### Share links trust "knows the ID/slug", same as the rest of the app

**Decision:** anyone who calls `POST /api/chat/session/[id]/share` can
enable sharing for that session — no ownership check against the
signed-in user.

**Why this is consistent, not a hole:** the app never had per-session
access control to begin with — `GET /api/chat/session/[id]` has always
returned a session's content to anyone who has its id, guest or
signed-in, since that's how a guest can use the product at all without
an account. Sharing doesn't lower that bar, it just makes the same
already-reachable content reachable via a shorter, deliberately-shared
slug instead of the raw session id. Requiring ownership to _enable_
sharing while anyone can already _view_ the session would be
inconsistent, not more secure.

**What this doesn't cover:** rate-limiting or expiring share links, and
there's no "unshare" endpoint yet. Both are reasonable Phase 7 additions
once there's an actual abuse case to design against, rather than
speculative hardening now.

### Full-site crawl mode deferred out of Phase 6

**Decision:** did not implement Firecrawl's `/v2/crawl` endpoint this
phase, despite it being in the original plan.

**Why:** `/v2/scrape` (used since Phase 2) is a single request/response —
straightforward to wrap in a service method. `/v2/crawl` is
fundamentally different: it starts an asynchronous job and requires
polling a status endpoint until it completes, often taking much longer
than a single page scrape. Building this properly means job-status UI,
polling logic, partial-progress handling, and much more deliberate
credit-cost messaging (a crawl can burn through far more Firecrawl
credits than a single scrape) — that's closer to its own contained
feature than something to bolt on alongside session history, sharing, and
export in the same pass. Deferred with a clear note rather than shipped
half-built.

### Structured logger wraps Sentry, rather than scattering Sentry calls everywhere

**Decision:** all server-side error reporting goes through
`logger.error()` (`src/lib/logger.ts`), which both prints a structured
JSON line and calls `Sentry.captureException()` internally. Route
handlers never call Sentry directly.

**Why:** every route handler already needed _some_ form of error
logging; giving that single call site the additional job of also
reporting to Sentry means observability is a property of using the
logger correctly, not a second thing to remember to wire up per route.
It also means swapping error-tracking providers later is a one-file
change.

**Why JSON lines instead of a logging library:** at this project's
scale, `console.log(JSON.stringify(...))` is the entire feature a
logging library would provide (structured, parseable output) without a
new dependency. If this needed log levels controlled by environment,
multiple transports, or sampling, that calculus would change.

### Admin dashboard is deliberately crude, not a permission system

**Decision:** `/admin` and `/api/admin/stats` check a single
`ADMIN_EMAIL` environment variable against the signed-in user's email —
no roles table, no permissions model.

**Why this is honest, not lazy:** this is a Phase 8 "nice to have" for
visibility into product health, not a multi-admin SaaS feature. Building
a real role-based access control system for a single-admin portfolio
project would be speculative complexity with no current use case driving
it. The one place this comparison happens (`src/lib/admin.ts`) is exactly
where a real permissions system would plug in later, if multiple admins
were ever actually needed.

### Sentry DSN is intentionally a `NEXT_PUBLIC_` variable

**Decision:** `NEXT_PUBLIC_SENTRY_DSN`, not a server-only `SENTRY_DSN`.

**Why this isn't a secrets-handling mistake:** a Sentry DSN is a
destination identifier ("send events here"), not an authentication
credential — Sentry's own setup docs use the `NEXT_PUBLIC_` prefix
deliberately, since the client-side SDK needs it to report browser
errors. This is a different category from the actual secrets audited in
Phase 7 (`FIRECRAWL_API_KEY`, `GEMINI_API_KEY`, etc.), which remain
server-only and were specifically verified not to leak into the client
bundle.

## Consequences

- The service layer (`src/lib/services`, `src/lib/ai`, `src/lib/repositories`)
  must stay framework-agnostic and independently unit-testable — this is
  enforced by keeping Next.js imports out of that layer entirely.
- Any future service extraction (e.g. moving scraping to a background job
  queue) only requires changing what calls the service layer, not the
  service layer itself.

---

### Playwright: Chromium-only in CI, full flow gated behind real credentials

**Decision:** the E2E suite runs against Chromium only (not the
originally-planned Chromium + WebKit), and the one test exercising the
complete real flow (`chat-flow.spec.ts`) only runs when
`E2E_REAL_APIS=true` plus real Firecrawl/Gemini/Upstash credentials are
present — it skips itself cleanly otherwise, both locally and in CI.

**Why not mock the AI/scrape calls instead, the way `FirecrawlProvider`
and `GeminiClient` are unit-tested?** Playwright's standard mocking tool,
`page.route()`, intercepts requests the _browser_ makes. This app's
scrape and chat calls happen inside Next.js API route handlers —
server-side, initiated by the Node.js process, never by client-side
`fetch`. There's nothing at the browser layer for Playwright to
intercept. Properly mocking this would mean building a parallel
dependency-injection seam specifically for E2E runs (an env-flag that
swaps in fake service implementations at the route-handler level) —
a real, legitimate pattern, but a meaningfully bigger addition than
"write some Playwright tests," and one that risks the E2E suite
testing the fakes' wiring rather than anything real. Gating behind real
credentials keeps the test honest about what it actually proves, at the
cost of not running by default.

**Why Chromium-only:** WebKit and Firefox both roughly double E2E run
time for coverage of browser-engine differences that matter most for
complex custom rendering (canvas, exotic CSS) — lower-value here than in
a project doing more unusual rendering work. The `webkit` project is
present in `playwright.config.ts`, just commented out, for exactly the
moment that trade-off changes (e.g. before a major release).

### This phase's tests could not be run before delivery — a different kind of gap than usual

Every other "couldn't verify live" note in this project (Prisma's engine
binaries, Firecrawl/Gemini's real APIs) still had _some_ independent
verification path — unit tests with mocks, or a live run once real
credentials existed. Playwright is different: its browser binaries
download from `cdn.playwright.dev`, which this sandbox's network access
doesn't reach, meaning these specific tests were never executed even
once, in any form, before being handed over. They're written carefully
against the actual rendered component tree and Playwright's documented
APIs, not guessed at — but that is a meaningfully weaker claim than
everything else in this codebase, and it's called out this explicitly
on purpose.

### Custom sign-in page: built because a real test surfaced it, not planned upfront

**Context:** `auth.config.ts` set `pages: { signIn: '/sign-in' }` back
in Phase 4 — telling Auth.js "use my own page instead of your built-in
one" — but no page was ever built at that route. This went unnoticed
through Phases 4-9 because nothing exercised the actual sign-in button
click end-to-end; unit tests mock `next-auth/react` entirely, and manual
testing apparently always went straight to `/api/auth/signin` rather
than clicking the real button.

**What surfaced it:** a real Playwright E2E test, clicking the actual
button and asserting on the resulting URL. The test failed with the
browser sitting on `/sign-in` — a genuinely useful, concrete failure
that pointed exactly at the gap, rather than a vague "something's off."
This is precisely the kind of bug unit tests structurally can't catch
(everything downstream of `next-auth/react` is mocked in the unit
suite) and exactly what E2E testing is for.

**Decision:** build the real page (`src/app/sign-in/`) rather than
remove the `pages.signIn` override and fall back to Auth.js's stock
page. A custom, on-brand sign-in screen is better UX and better
portfolio material than the generic default — the override was the
right call in Phase 4, just incomplete until now.

**Why it lives outside the `(main)` route group:** the shared layout
there renders the session history sidebar, which would show "sign in to
see your history" directly beside a page whose entire purpose is
letting you do exactly that — redundant at best, confusing at worst.
`src/app/sign-in/` uses the root layout only (fonts, theme, providers),
nothing else.

**Why `page.tsx` and `SignInForm.tsx` are separate files:** the form
needs `useSearchParams()` (Auth.js passes `callbackUrl` and `error` as
query params to a custom sign-in page), which requires a Suspense
boundary for the surrounding page to still statically prerender. Server
component (`page.tsx`) wraps the client component (`SignInForm.tsx`) in
`<Suspense>` — the standard, documented pattern for this exact situation.

### Documentation kept as separate, purpose-built files rather than one long README

**Decision:** the README stays focused on "how do I run and verify
this," while `docs/case-study.md` carries the narrative (why it was
built, what was hard, what I'd change), and `docs/security-checklist.md`
/ `docs/architecture.md` stay as focused reference docs each covering
one concern.

**Why:** a README trying to be both a setup guide and a compelling
portfolio narrative tends to do both jobs worse — someone cloning the
repo to actually run it doesn't want to scroll past a security-bug
story to find the `npm install` command, and someone evaluating the
project for a portfolio read doesn't want to wade through env var
tables to find out what was actually hard about building it. Splitting
them lets each document be dense with the right information for its
actual reader.
