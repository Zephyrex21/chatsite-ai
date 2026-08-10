# Case Study: Building ChatSite

_A "chat with any website" app, built solo across ten phases — this is
the real story, not a highlight reel. Where something broke, I've kept
that in._

---

## The problem

You find an interesting but dense webpage — documentation, a long
article, a product page buried in marketing copy — and you don't want
to read the whole thing to find one answer. Copy-pasting it into a
general chatbot works, but it's manual, loses formatting, and doesn't
scale to "let me ask three follow-up questions."

ChatSite does the copy-paste step for you: paste a URL, and it scrapes,
grounds, and lets you have an actual conversation about that specific
page — with the AI honestly saying "that's not covered here" when it
doesn't know, rather than making something up.

## Why build this, and why this way

I wanted a project that exercised the _whole_ stack of what a real
production app needs — not just "does the AI feature work," but auth,
security, observability, and testing discipline too. So instead of
building it in one pass, I built it in ten explicit phases, each one a
working, tested increment, and documented the reasoning for every major
decision as I went (see [`docs/adr-0001-tech-stack.md`](adr-0001-tech-stack.md)
for the full list). A few of the bigger calls:

- **Next.js monolith over microservices** — a solo project doesn't need
  the operational overhead of service separation, but the codebase is
  layered (routes → services → repositories) so that separation is a
  mechanical extraction later, not a rewrite, if it's ever needed.
- **PostgreSQL, not Mongo, despite a prior project using Mongo** — the
  data here (users, sessions, messages) is genuinely relational.
  Deliberately not defaulting to the same database for every project.
- **JWT auth sessions, but still with a database adapter** — session
  _verification_ never touches the database (fast, and doesn't need a
  DB round-trip on every request), but user/account records still get
  persisted for real "sign in and see your history" functionality.

## The interesting part: a real security bug, found by testing it properly

Here's the part I'm most glad happened, honestly. Back in Phase 2, I
built SSRF protection so the app couldn't be tricked into scraping
`localhost` or a cloud metadata endpoint — the usual checks: reject
`127.0.0.1`, reject private IP ranges, reject `localhost` by name.
Reasonable, and it shipped with tests.

In Phase 7 (the dedicated security-hardening pass), instead of trusting
that earlier work, I wrote a standalone script and threw known,
documented SSRF bypass techniques at the actual validation function —
not the kind of thing that occurs to you unless you're specifically
looking for it:

```
http://[::ffff:127.0.0.1]/     — IPv4-mapped IPv6 address
http://[fe80::1]/               — IPv6 link-local range
http://[fc00::1]/               — IPv6 unique-local range
```

All three sailed straight through. The original check only understood
plain dotted-decimal IPv4 addresses and one literal IPv6 string
(`[::1]`) — it had no idea an IPv6 address could _smuggle_ a blocked
IPv4 target inside it. That's a real, documented, real-world SSRF
filter bypass class, not a contrived edge case.

The fix meant actually decoding the IPv6 address's embedded IPv4 bytes
and running them back through the existing IPv4 check — and then, to
make sure the fix didn't just trade one bug for another, verifying it
_against real public IPv6 addresses_ (Google's public DNS server) to
confirm nothing legitimate got blocked. Full writeup, with every test
case, is in [`docs/security-checklist.md`](security-checklist.md).

The honest reason I'm featuring this over a flashier story: it's the
best evidence in this whole project that "I wrote tests" and "I verified
the thing actually does what I claim" aren't the same activity. The
first pass had tests. They just tested the cases I'd already thought of.

## A second one, because it happened again — differently

Phase 9 (E2E testing with Playwright) found something unit tests
structurally _couldn't_ have caught: back in Phase 4, I'd configured
Auth.js to use a custom sign-in page (`pages.signIn: '/sign-in'`) — but
never actually built that page. Every unit test mocks `next-auth/react`
entirely, so nothing ever noticed. Manual testing apparently always
went straight to the Auth.js default route directly, never through the
actual button.

A real Playwright test — click the actual button, assert on the actual
resulting URL — landed on a 404 immediately. That's the difference
between mocked tests (verify your code does what you told it to) and
end-to-end tests (verify the _system_, wired together, does what a user
needs). Both are necessary; they catch different classes of bug, and
this project needed to actually hit both classes to be honest about it.

## What I'd do differently at scale

- **Full-site crawl mode** (scrape every page of a site, not just one
  URL) got explicitly deferred in Phase 6 — Firecrawl's crawl endpoint
  is asynchronous (job + polling), a meaningfully bigger feature than a
  single scrape. At real scale, this is probably the single highest-value
  feature left on the table.
- **DNS-rebinding-proof SSRF protection.** The IPv6 fix closes a
  hostname-string-level bypass; it doesn't defend against a hostname
  that resolves to a private IP _at request time_ (a domain like
  `x.nip.io`). Closing that fully means resolving the hostname and
  pinning the connection to the resolved IP — reasonable to defer for
  now specifically because Firecrawl's infrastructure (not this server)
  makes the actual outbound request, but the first thing I'd revisit if
  this app ever added a self-hosted fallback scraper.
- **Source attribution on answers** (highlighting which part of the
  page an answer came from) was scoped out from the start as needing
  real chunking + citation-matching — closer to a second AI pipeline
  than a UI feature. Worth doing once the core product had real usage
  data to justify it.
- **A real DI seam for E2E-testing the full AI flow.** Right now the
  complete scrape-then-chat E2E test only runs against live APIs (gated
  behind real credentials) because the AI calls happen server-side,
  where Playwright's usual browser-level mocking can't reach. A proper
  fix is a test-mode dependency injection point at the service layer —
  legitimate, but a bigger lift than "write some Playwright tests,"
  and I'd rather ship that deliberately than half-build it.

## Testing philosophy

72 unit/integration tests (Vitest, ~98% coverage on the layers that
matter), 8 Playwright E2E tests (7 passing, 1 correctly gated behind
real API credentials), all running in CI on every push. A few
deliberate, documented choices about _what's not_ covered:

- Thin wrappers around external services (the Prisma client, the Gemini
  SDK, the Upstash Redis client) are excluded from the coverage
  threshold — not because they're untested, but because mocking their
  internals convincingly would mean asserting against my own guesses at
  their wire format rather than reality. They're verified by real usage
  instead. The orchestration logic that calls them is what's actually,
  thoroughly, unit-tested.
- The E2E suite is Chromium-only in CI (not Chromium + WebKit) — a
  deliberate speed/coverage trade-off, revisited before anything that'd
  actually need cross-browser confidence.

Full reasoning for every one of these calls is in
[`docs/adr-0001-tech-stack.md`](adr-0001-tech-stack.md).

## Try it

- **Live demo:** _(add your deployed URL here once live)_
- **Run it locally:** see the [README](../README.md#getting-started)
- **Full architecture:** [`docs/architecture.md`](architecture.md)
