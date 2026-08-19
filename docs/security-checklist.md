# Security Checklist — Phase 7

Each item below was actually checked, not assumed. Where something was
found and fixed during this pass, that's noted explicitly — the goal of
this document is to be an honest record, not a box-ticking exercise.

---

## ✅ SSRF protection on user-submitted URLs

**Threat:** a user submits a URL targeting an internal service, localhost,
or a cloud metadata endpoint instead of a real public website.

**Verified by:** writing a standalone test script exercising the actual
`validatePublicUrl()` function against known SSRF bypass techniques,
before trusting the existing Phase 2 test suite alone.

**Found and fixed during this pass:** the original implementation only
checked plain dotted-decimal IPv4 hostnames and the literal string
`[::1]`. Direct testing found two real gaps:

1. **IPv4-mapped IPv6 addresses** (`::ffff:127.0.0.1` and its canonical
   `::ffff:7f00:1` hex-group form) were **not** detected — this is a
   documented, real-world SSRF filter bypass technique. Fixed by adding
   `isPrivateOrSpecialIPv6()`, which decodes the embedded IPv4 address and
   runs it through the existing IPv4 check.
2. **IPv6 link-local (`fe80::/10`) and unique-local (`fc00::/7`) ranges**
   were allowed through entirely. Fixed in the same function.

**Confirmed _not_ broken by the fix:** legitimate public IPv6 addresses
(tested against Google's public DNS, `2001:4860:4860::8888`, and a public
IPv4-mapped address) remain correctly allowed — the fix doesn't
over-block.

**Confirmed already safe (no fix needed):** decimal, hex, and
octal-encoded IPv4 addresses (`http://2130706433/`,
`http://0x7f000001/`) — these get canonicalized to standard dotted-decimal
form by the URL parser itself _before_ validation ever runs, so the
existing IPv4 check already caught them. Verified directly rather than
assumed, since this is exactly the kind of thing that's easy to get wrong.

**Known, accepted limitation:** this check operates on the _hostname
string_, not a DNS resolution. It does not protect against DNS-rebinding
attacks (e.g. a domain like `x.nip.io` that resolves to a private IP at
request time) — closing that fully requires resolving the hostname and
pinning the connection to the resolved IP, which is a meaningfully bigger
change than this phase's scope. This is a reasonable gap to accept for
now, for a specific architectural reason: **this server never makes the
actual outbound request to the submitted URL itself** — Firecrawl's
infrastructure does, on `POST /v2/scrape`. This check is defense-in-depth
(protects this server if a future code path ever fetches directly) and a
cost/abuse guard (no point spending a Firecrawl credit on an obviously
invalid target), not the only or primary line of defense against the
target URL itself — Firecrawl, as a scraping provider, is expected to run
its own SSRF protections against the sites it connects to.

18 automated regression tests cover this (`tests/unit/url.test.ts`),
including every case above.

---

## ✅ Rate limiting on every public endpoint

**Threat:** unlimited requests to expensive or write-taking endpoints,
either by a bad actor or an innocent bug (e.g. a retry loop).

**Verified by:** auditing every route under `src/app/api` by hand and
confirming each one calls either `expensiveRateLimit` (scraping/AI calls)
or `apiRateLimit` (cheaper reads/writes).

**Found and fixed during this pass:** two endpoints added in Phase 6 had
been missed — `GET /api/chat/session/[sessionId]` and
`POST /api/chat/session/[sessionId]/share`. Both now call `apiRateLimit`.

| Endpoint                            | Limiter                | Why                                                                                                                                                                                                          |
| ----------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /api/scrape`                  | expensive (10/min)     | costs a Firecrawl credit                                                                                                                                                                                     |
| `POST /api/chat/session`            | expensive (10/min)     | may trigger a scrape                                                                                                                                                                                         |
| `POST /api/chat`                    | expensive (10/min)     | costs a Gemini call                                                                                                                                                                                          |
| `GET /api/chat/session/[id]`        | api (60/min)           | read, but still a DB query                                                                                                                                                                                   |
| `POST /api/chat/session/[id]/share` | api (60/min)           | write, but cheap                                                                                                                                                                                             |
| `GET /api/chat/sessions`            | api (60/min)           | read                                                                                                                                                                                                         |
| `GET /api/share/[slug]`             | api (60/min)           | public, no auth required                                                                                                                                                                                     |
| `/api/auth/[...nextauth]`           | _(not custom-limited)_ | Auth.js's own routes; OAuth flows have their own provider-side abuse protections, and rate-limiting the sign-in redirect itself is not standard practice                                                     |
| `GET /api/cron/purge-expired-sites` | _(not custom-limited)_ | Added Phase 9. Not reachable without the `CRON_SECRET` bearer header — an unauthorized request gets a 401 before touching the database, so there's no meaningful abuse surface for a rate limiter to protect |

---

## ✅ Input length limits

**Threat:** a user (or script) submits an extremely large payload — a
multi-megabyte "question," for instance — inflating AI cost or risking
hitting the model's context ceiling.

**Found and fixed during this pass:** there was no limit on chat question
length at all before this phase. Added a 4,000-character server-side
limit in `ChatService.ask()` (the actual security boundary — this runs
regardless of what the client sends) plus a matching client-side
`maxLength` on the composer textarea (for immediate UX feedback, not a
security control by itself since client-side limits are trivially
bypassed by anyone calling the API directly).

Also added a 2,048-character URL length limit in `validatePublicUrl()`,
covering both `/api/scrape` and `/api/chat/session`.

Covered by tests: `chat-service.test.ts` (question length) and
`url.test.ts` (URL length).

---

## ✅ Secrets never reach the client bundle

**Threat:** an API key or database credential accidentally ends up in
client-side JavaScript, visible to anyone who opens dev tools.

**Verified by, in order of rigor:**

1. Grepped every file marked `'use client'` for any `process.env`
   reference — none found.
2. Grepped the whole codebase for a `NEXT_PUBLIC_` prefix (the only way
   Next.js intentionally exposes an env var to the client) — none exist.
3. **Built the app with distinctive canary secret values**
   (`CANARY_SECRET_VALUE_12345` etc. in place of real keys) and grepped
   the compiled client-side static output (`.next/static`) for those
   exact strings — not found.

**Honest caveat:** the build in this environment can't complete its final
typecheck step (the same Prisma-client-generation limitation noted
throughout this project's history — see the README), so step 3 verifies
the compile/bundle stage specifically, not a 100%-complete production
build. Re-running the canary-secret grep after your own successful
`npm run build` would close that last gap with full confidence.

---

## ✅ Dependency audit

**Verified by:** `npm audit`, then acting on what was actually
actionable.

- **Fixed:** `brace-expansion` (high severity, DoS via unbounded
  expansion) — had a real fix available via `npm audit fix` with no
  breaking change. Applied it, then re-ran `npm ci` to confirm the
  lockfile was still valid (the exact class of mistake that broke CI once
  already in this project — not repeating it silently).
- **Remaining (accepted, not actionable):** `postcss` and `sharp`, both
  nested transitive dependencies _inside Next.js's own dependency tree_,
  not top-level dependencies of this project. The only fix `npm audit`
  offers is downgrading to `next@9.3.3` — a multi-major-version
  regression, not a reasonable trade for these advisories. Tracked, not
  ignored: re-check `npm audit` before each production deploy, since this
  resolves itself once Next.js ships an update with patched nested deps.
  **Update, Phase 8:** the reported count rose from 4 to 7 (4 moderate, 3
  high) after adding Sentry, Vercel Analytics, and Speed Insights — each
  of those also depends on `next`, opening more graph paths to this same
  already-known issue. Confirmed this is not a new, distinct problem:
  same two packages, same root cause, same conclusion.
- **Automated going forward:** added a non-blocking `npm audit
--audit-level=high` step to CI (`.github/workflows/ci.yml`) — it won't
  fail the build over the accepted nested-dependency findings above, but
  a _new_ actionable vulnerability will now show up in CI logs on every
  push instead of requiring someone to remember to check by hand.

---

## ✅ CSRF exposure on state-changing endpoints

**Threat:** a malicious site tricks a signed-in user's browser into
making an unwanted request to this app (e.g. starting chat sessions or
burning their rate-limit budget without their knowledge).

**Reasoned through and verified, not just assumed:**

- Every custom API route (`/api/scrape`, `/api/chat*`) only accepts
  `Content-Type: application/json` and explicitly parses the body with
  `request.json()`. A classic CSRF payload — a plain HTML `<form>`
  submitted from another origin — sends `application/x-www-form-urlencoded`
  by default, which fails our JSON parsing and returns a `400` rather than
  doing anything, without needing a dedicated CSRF token to stop it.
- A cross-origin **JavaScript** `fetch()` with a JSON body triggers a
  browser CORS preflight (`OPTIONS`) request first, since
  `application/json` isn't a CORS-"simple" content type. This app doesn't
  implement an `OPTIONS` handler or set any `Access-Control-Allow-Origin`
  header, so the browser blocks the actual request from ever being sent
  cross-origin.
- Auth.js's own sign-in/callback flow has its own built-in CSRF
  protection (a `state` parameter for the OAuth flow) — not something
  this project needs to implement itself.

**Conclusion:** no dedicated CSRF token system was added, because the
combination of JSON-only body parsing and the absence of permissive CORS
headers already closes the practical attack surface for this app's
current endpoints. If a route ever needs to accept
`application/x-www-form-urlencoded` or sets permissive CORS headers in
the future, this conclusion should be revisited.

---

## Not done this phase (explicit, not silent)

- **DNS-rebinding-proof SSRF protection** (resolve + pin connection) —
  see the SSRF section above for the architectural reasoning on why this
  is an acceptable gap for now.
- **Share-link expiration or an "unshare" endpoint** — noted in
  ADR-0001 under the Phase 6 sharing decision; a reasonable follow-up
  once there's an actual abuse pattern to design against.

---

## ✅ Phase 9 polish pass

A follow-up audit after Phase 8 found five items worth closing out. All
five are done as of this pass.

**Security headers.** `next.config.ts` had no `headers()` at all — no
CSP, HSTS, X-Frame-Options, Referrer-Policy, or Permissions-Policy. Added
all five (see `next.config.ts`). The CSP allows `'unsafe-inline'` for
`script-src`/`style-src` — a real, documented trade-off (see the comment
above `CSP` in `next.config.ts`) rather than an omission: a properly
nonce-based CSP needs a `middleware.ts` that generates a per-request
nonce and threads it through Next's own inline script/style injection,
which is a bigger change than this pass. Everything else in the policy
(`frame-ancestors 'none'`, `object-src 'none'`, an explicit `connect-src`
allowlist instead of `*`) still meaningfully narrows the attack surface.

**Session ownership.** Previously, anyone who learned a chat `sessionId`
could read _and post messages into_ someone else's session, signed-in or
not — the share route's old comment explicitly reasoned this was "the
same trust boundary the rest of the app already uses." That's still true
for **guest** sessions (no signed-in owner exists to check against — an
intentional, unchanged trade-off). But a session created while signed in
now has an enforced owner: `ChatService` rejects `getSession()`, `ask()`,
and `enableSharing()` calls from a different user with the same
`SESSION_NOT_FOUND` a genuinely missing session produces (never a `403`,
which would confirm the session's existence to an attacker). See
`ChatService.assertOwnership()` and the ownership test suite in
`tests/unit/chat-service.test.ts`.

**Cache purging.** `ScrapedSite` rows past their TTL were already treated
as a cache miss by `findFreshByUrl()`, but nothing ever deleted them —
the table grew unbounded. Added `ScrapedSiteRepository.deleteExpired()`
plus a Vercel Cron job (`GET /api/cron/purge-expired-sites`, scheduled
daily in `vercel.json`), gated by a `CRON_SECRET` shared-secret header
rather than a signed-in admin session, since Vercel Cron's own requests
aren't a browser session to begin with.

**Not a security item, included for completeness:** the Gemini model
priority was swapped (3.5 Flash is now primary, 2.5 Flash the fallback)
to reflect the current GA lineup, and assistant chat messages now render
through a small dependency-free markdown-lite parser
(`src/lib/markdown/parse.ts`) instead of as raw escaped text — see that
file's own header comment for why a parser was written in-house instead
of adding `react-markdown`/`remark` as dependencies.

---

## Phase 10 — cross-provider account linking

`allowDangerousEmailAccountLinking: true` is set on both the GitHub and
Google providers in `src/auth.config.ts`. Auth.js's default behavior
refuses to attach a new OAuth provider to an existing account sharing
its email — the "dangerous" naming is because that default exists to
stop an unverified/spoofable email at one provider from being used to
hijack an account created via another. That risk doesn't apply between
GitHub and Google specifically: both only ever return emails they've
themselves verified, so there's no unverified-email vector here to
guard against. Without the flag, signing up via GitHub and later trying
Google (or vice versa) with the same address always fails with
`OAuthAccountNotLinked` — worse UX than the linking risk is real, for
this specific pair of providers. Full reasoning is in the code comment
above the providers array.

---

## Phase 10 — hero illustration dark-mode contrast

Not a security item, but the same "measure it, don't eyeball it" spirit
as the WCAG fixes above. The hero illustration's browser-window card
used `--clay-primary-tint` → `--clay-surface` for its gradient, on a
`--clay-bg` page background — in dark mode these three values measured
within 0.014 of each other in relative luminance (contrast ratio
~1.05:1), so the card read as a flat, undifferentiated blob with its
content lines nearly invisible. Fixed with a set of `--hero-*` CSS
variables scoped to the illustration alone (defined in `globals.css`,
referenced from `HeroIllustration.tsx`) — light mode is byte-for-byte
unchanged, dark mode gets its own tuned values verified with the actual
sRGB luminance formula (card-vs-page now measures 1.68:1, up from
~1.05:1). Scoped this way specifically to avoid touching
`--clay-surface`/`--clay-text` globally, which other already-audited
components rely on at their current values.
