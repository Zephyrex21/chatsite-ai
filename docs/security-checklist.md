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

| Endpoint                            | Limiter                | Why                                                                                                                                                      |
| ----------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/scrape`                  | expensive (10/min)     | costs a Firecrawl credit                                                                                                                                 |
| `POST /api/chat/session`            | expensive (10/min)     | may trigger a scrape                                                                                                                                     |
| `POST /api/chat`                    | expensive (10/min)     | costs a Gemini call                                                                                                                                      |
| `GET /api/chat/session/[id]`        | api (60/min)           | read, but still a DB query                                                                                                                               |
| `POST /api/chat/session/[id]/share` | api (60/min)           | write, but cheap                                                                                                                                         |
| `GET /api/chat/sessions`            | api (60/min)           | read                                                                                                                                                     |
| `GET /api/share/[slug]`             | api (60/min)           | public, no auth required                                                                                                                                 |
| `/api/auth/[...nextauth]`           | _(not custom-limited)_ | Auth.js's own routes; OAuth flows have their own provider-side abuse protections, and rate-limiting the sign-in redirect itself is not standard practice |

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
- **Remaining (accepted, not actionable):** 4 vulnerabilities (1
  moderate, 3 high) in `postcss` and `sharp`, both nested transitive
  dependencies _inside Next.js's own dependency tree_, not top-level
  dependencies of this project. The only fix `npm audit` offers is
  downgrading to `next@9.3.3` — a multi-major-version regression, not a
  reasonable trade for these advisories. Tracked, not ignored: re-check
  `npm audit` before each production deploy, since this resolves itself
  once Next.js ships an update with patched nested deps.
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
