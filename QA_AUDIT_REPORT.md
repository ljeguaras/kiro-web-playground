# QA Audit Report - Personal Budget Tracker

**Audited branch:** `feature/budget-tracker`
**Audited commit:** `d563b5edd90ab59e8c092bc456c64306110de97b`
**Audit branch used for the review:** `qa-budget-tracker` (created from `origin/feature/budget-tracker`; baseline commit `fb33ae9` contains only QA scaffolding, no app-source changes)
**Application:** Next.js 16.2.4 (App Router, Turbopack) · React 19 · TypeScript 5 · Tailwind CSS v4 · Supabase (Auth + Postgres + RLS) · Tesseract.js (client OCR) · Google Gemini (receipt parsing) · Recharts · lucide-react
**Audit method:** Live testing of the running dev server (`next dev`, port 3000) via HTTP probing plus rigorous source-level code review. See the note on live-testing constraints below.
**Date of audit toolchain:** Node v22.23.2, npm 11.4.2 (via nvm).

---

## Live-testing constraints (read first)

The application requires three external secrets that are **not present** in this environment and for which there is **no `.env.example` and no `.env.local`** anywhere on the branch:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

Because `middleware.ts` runs on nearly every path and `lib/supabase/middleware.ts:9` calls `createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, …)` with those vars undefined, **every route returns HTTP 500 at runtime** - including the public landing page and the auth pages. This was confirmed live (see BUG-001).

To gather as much live evidence as possible I performed the audit in two live passes:

1. **No-credentials pass (true production-representative state):** started `next dev` with no env vars and probed all routes. Result: every route → **HTTP 500**, with the server logging `Error: Your project's URL and Key are required to create a Supabase client!` at `updateSession (lib/supabase/middleware.ts:9)` → `middleware (middleware.ts:5)`.
2. **Fake-credentials pass (diagnostic only - explicitly labeled):** started `next dev` with **syntactically valid but fake** placeholder values (`https://fake-project-abc123.supabase.co` and a dummy JWT-shaped anon key) to observe how far pages render before any real Supabase network call is needed. This pass is a diagnostic to isolate the root cause; **it is not a functional pass**. Any Supabase-backed data operation (login, signup persistence, all CRUD, receipt save) still cannot succeed because the credentials are fake. Results of this pass are labeled `[fake-creds]` throughout.

Everything gated behind **real** Supabase/Gemini credentials (actual authentication, all dashboard/transactions/budgets/settings CRUD, receipt OCR + AI parsing) is therefore assessed by **code review** and marked **Blocked (requires Supabase/Gemini credentials not present in the environment)** in the QA Summary - blocked, not passed and not failed.

**Live evidence captured (HTTP status codes):**

| Route | No-creds pass | Fake-creds pass |
|-------|---------------|-----------------|
| `/` (landing) | 500 | 200 (renders "Track Expenses", "Snap a Receipt", "Get Started Free") |
| `/login` | 500 | 200 (renders "Welcome Back", email + password inputs, "Continue with Google") |
| `/signup` | 500 | 200 |
| `/dashboard` | 500 | 307 → `/login` (unauthenticated redirect works) |
| `/transactions` | 500 | 307 → `/login` |
| `/budgets` | 500 | 307 → `/login` |
| `/settings` | 500 | 307 → `/login` |
| `/scan` | 500 | 307 → `/login` |
| `/nonexistent-xyz` | 500 | 404 (Next.js not-found) |
| `/dashboardx` | 500 | (see BUG-011 note on `startsWith` matching) |

**Screenshot reference:** Headless browser screenshots could not be persisted in this sandbox because background processes (the dev server) are reaped when each shell command returns, so a separate browser process cannot attach to a live server. Live evidence was therefore captured as HTTP status codes, rendered HTML content, and server-side error stack traces within single-invocation runs. Where a screenshot would normally be attached, the field reads `N/A - see HTTP/rendered-content evidence` or `N/A - blocked/code-level`.

---

## 1. QA Summary

- **Total pages / routes in scope:** 13
  - Public: `/` (landing)
  - Auth: `/login`, `/signup`
  - Authenticated app: `/dashboard`, `/transactions`, `/transactions/new`, `/budgets`, `/settings`, `/scan`
  - API / system: `/api/parse-receipt`, `/auth/callback`, middleware (`middleware.ts`), `_not-found`
- **Total tests / checks executed:** 69 (build, lint, dependency audit, per-route HTTP probes in two passes, form-validation review, routing/redirect checks, submit-handler session-loss review, and per-file code-level checks across functional, security, accessibility, and performance dimensions)
- **Passed:** 14
  - Static build compiles (0 type errors, 13 routes generated)
  - Lint passes (0 errors, 1 warning)
  - `[fake-creds]` landing page renders (200) with expected hero/feature content
  - `[fake-creds]` login page renders (200) with email/password fields and Google button
  - `[fake-creds]` signup page renders (200)
  - `[fake-creds]` unauthenticated access to `/dashboard`, `/transactions`, `/budgets`, `/settings`, `/scan` correctly 307-redirects to `/login` (protected-route gating logic is correct once a Supabase client can be built)
  - `[fake-creds]` unknown route returns a proper 404
  - Password fields use `type="password"` (masking) on login and signup
  - HTML5 client validation present: `required` on email/password/amount/date; `type="email"`; signup password `minLength={6}`; amount `min` constraints
  - React auto-escaping in place; no `dangerouslySetInnerHTML` anywhere in the app
  - RLS enabled with per-user policies on all four tables in `supabase/schema.sql`
  - DB CHECK constraints (`amount > 0`, `type IN ('income','expense')`) present
  - Semantic HTML landmarks (`<main>`, `<header>`, `<nav>`, `<section>`, `<article>`, `<footer>`) used across pages
  - Responsive Tailwind breakpoints (`sm:`/`md:`/`lg:`) used throughout layouts
- **Failed:** 9 (BUG-001 through BUG-008 and BUG-017 below reproduce or are provable from source)
- **Blocked:** 10 - **reason: requires Supabase/Gemini credentials not present in the environment**
  1. Real login (email/password) - end-to-end
  2. Google OAuth login + `/auth/callback` code exchange
  3. Signup persistence (auth user, profile row, default categories)
  4. Dashboard data + Recharts rendering with real transactions/budgets
  5. Transactions list load, filter-with-data, delete (CRUD)
  6. Add-transaction persistence (`/transactions/new`)
  7. Budgets CRUD + upsert + month selector with data
  8. Settings: profile save, category add/delete (CRUD)
  9. Delete-account flow (data teardown)
  10. Receipt scan end-to-end (Tesseract OCR + `/api/parse-receipt` Gemini call + save)

> Note: several of the Failed items (e.g. BUG-001) also *block* the ability to functionally test the Blocked items, because the app cannot serve a single page without credentials.

---

## 2. Bug Report Table

| ID | Severity | Priority | Component | Description |
|----|----------|----------|-----------|-------------|
| BUG-001 | Critical | P0 | `middleware.ts` / `lib/supabase/middleware.ts` | Missing Supabase env vars make the Supabase client constructor throw inside middleware, so **every route (including public landing + auth pages) returns HTTP 500**. App is completely non-functional out of the box and there is no `.env.example` documenting the required vars. |
| BUG-002 | High | P1 | `app/(app)/transactions/page.tsx` (`exportCSV`) | CSV export builds rows by raw string concatenation with no escaping of commas/quotes/newlines and no formula-injection guard (`= + - @`), enabling broken columns and CSV/formula injection into spreadsheets. |
| BUG-003 | High | P1 | `app/api/parse-receipt/route.ts` | The receipt-parsing endpoint is **unauthenticated** - no user/session check - so anyone can POST arbitrary text and burn the Gemini quota (cost/DoS). It also does not enforce the 10-category whitelist server-side. |
| BUG-004 | High | P1 | `app/(app)/settings/page.tsx` (`deleteAccount`) | "Delete account" only deletes the `profiles` row and signs out; the **Supabase auth user is never deleted** and there is no re-authentication. User believes account is gone but the auth identity persists; email is unusable for re-signup. |
| BUG-005 | Medium | P2 | login / signup / new-transaction / settings | Raw `error.message` from Supabase is rendered directly to the user on failures, leaking backend/implementation details (information disclosure) and producing unfriendly UX. |
| BUG-006 | Medium | P2 | dashboard / transactions / budgets / settings / scan / new-transaction | `useEffect(loadData, [])` fetches silently swallow errors: only `res.data` truthiness is checked, `error` is ignored, `loading` never clears on failure, and there is no empty/error UI - pages hang on the spinner or show a false-empty state. |
| BUG-007 | Medium | P2 | new-transaction / settings / budgets forms | Double-submit race: the async submit awaits `supabase.auth.getUser()` before flipping the disabled/`loading` flag (and add-category/add-budget have weak or no guards), so a fast double-click can insert duplicate records. |
| BUG-008 | Medium | P3 | `app/(app)/scan/page.tsx` (line ~234) | Receipt preview uses a raw `<img>` instead of `next/image` (confirmed lint warning `@next/next/no-img-element`): no optimization, larger LCP/bandwidth. |
| BUG-009 | High | P1 | project dependencies | `npm audit` reports **7 vulnerabilities (6 high, 1 low)** including many high-severity Next.js advisories (middleware/proxy bypass, cache poisoning, CSP-nonce XSS, image-optimization DoS, SSRF). Directly relevant given the app relies on middleware for auth gating. |
| BUG-010 | Medium | P2 | money handling (`lib/utils.ts` + all sums) | All monetary values are JS floating-point `Number`; totals use `+` and display uses `toFixed(2)`, so accumulation rounding errors are possible (e.g. `0.1 + 0.2`). |
| BUG-011 | Low | P2 | `lib/supabase/middleware.ts` (`protectedPaths`/`authPaths`) | Route matching uses `pathname.startsWith(path)`, so `/dashboardx`, `/loginfoo`, etc. match a protected/auth prefix - over-broad gating on unintended paths. |
| BUG-012 | Low | P2 | `app/(app)/layout.tsx` (mobile menu, icon buttons) | Icon-only controls lack accessible names: mobile hamburger has no `aria-label`/`aria-expanded`; `Trash2`/`X` icon buttons and lucide SVGs lack `aria-hidden`/labels; screen-reader and keyboard-only users get unlabeled controls. |
| BUG-013 | Low | P3 | `lib/utils.ts` (`getMonthKey`, `formatDate`) + dashboard/budgets | Date bucketing uses local-timezone `Date` methods against `YYYY-MM-DD` DB dates parsed as UTC, so month/day boundaries can shift for users in negative-UTC offsets, misassigning transactions to the wrong month. |
| BUG-014 | Low | P3 | root config | `middleware` file convention is deprecated in Next 16.2.4; build and dev both warn `The "middleware" file convention is deprecated. Please use "proxy" instead.` |
| BUG-015 | Low | P3 | `app/auth/callback/route.ts` | The `next` redirect param is used unvalidated in `NextResponse.redirect(\`${origin}${next}\`)`. It is prefixed with `origin` (mitigates cross-origin open redirect) but is not restricted to an allow-list of internal paths; a crafted `next` can still bounce users to unexpected internal routes. Hardening recommended. |
| BUG-016 | Low | P3 | scan / new-transaction amount inputs | `parseFloat(amount)` with no upper bound and no NaN guard after the DOM layer; `min` is enforced by HTML5 only, so programmatic/bypassed submits can send `NaN` or unbounded values (DB `CHECK (amount > 0)` is the only real backstop). |
| BUG-017 | Medium | P2 | new-transaction / scan / settings submit handlers | The `if (!user) return;` early-return fires **after** the loading flag is set (`setLoading(true)` / `setStep("saving")` / `setSaving(true)`) and never resets it, so an expired session mid-submit permanently disables the button or strands the spinner with no error and no recovery. |

---

## 3. Detailed Bug Reports

### BUG-001 - App returns HTTP 500 on every route because Supabase env vars are missing (Critical / P0)
- **Description:** `middleware.ts` matches almost all paths and delegates to `updateSession` in `lib/supabase/middleware.ts`, whose first action (line 9) is `createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, …)`. With those variables undefined, the constructor throws, so the middleware throws for **every** request - even the public landing page and auth pages that don't otherwise need auth. There is no `.env.example` on the branch documenting these variables.
- **Steps to reproduce:**
  1. Check out `feature/budget-tracker`, `npm install`.
  2. Do not set any env vars (mirrors the shipped repo state).
  3. `next dev` and request `/`, `/login`, `/dashboard`.
- **Expected result:** Public landing and auth pages render (200). At minimum the app should fail gracefully with a clear "configuration missing" message.
- **Actual result:** Every route → **HTTP 500**. Server log: `Error: Your project's URL and Key are required to create a Supabase client!` at `updateSession (lib/supabase/middleware.ts:9:38)` → `middleware (middleware.ts:5:29)`. Confirmed live for `/`, `/login`, `/signup`, `/dashboard`, `/transactions`, `/budgets`, `/settings`, `/scan`, and unknown routes.
- **Suggested fix:** (a) Add a committed `.env.example` listing the three required variables and document setup in the README. (b) In `lib/supabase/middleware.ts`, guard for missing env: if either var is absent, skip session handling and `return NextResponse.next()` (or redirect to a friendly `/config-error` page) instead of constructing the client - so public pages still render. (c) Narrow the middleware `matcher` so it does not run on the public landing page. The `/config-error` fallback page must use semantic HTML (`<main>`, `<h1>`) and responsive Tailwind utilities (`min-h-screen flex items-center justify-center px-4`).
- **Screenshot reference:** N/A - see live HTTP evidence table (all routes 500) and server stack trace above.

### BUG-002 - CSV export is vulnerable to injection and column-breaking (High / P1)
- **Description:** In `exportCSV`, rows are built as `` `${t.date},${t.type},${t.category?.name || "Uncategorized"},${t.amount},"${t.note || ""}"` ``. Category names and notes are user-controlled and are inserted with no escaping. A comma, quote, or newline in a note/category breaks columns; a leading `=`, `+`, `-`, or `@` becomes a live formula when opened in Excel/Sheets (CSV/formula injection, e.g. `=HYPERLINK(...)` or `=cmd|...`).
- **Steps to reproduce (code-level; live blocked by BUG-001 + missing creds):**
  1. Create a transaction with note `=1+1` or `hello,"world"\nrow2`.
  2. Export CSV, open in a spreadsheet app.
- **Expected result:** Values are quoted/escaped; formula-leading characters are neutralized; columns stay aligned.
- **Actual result:** Note/category injected verbatim; formulas execute on open; delimiters break the layout.
- **Suggested fix:** Escape every field (wrap in quotes, double internal quotes) and prefix any field starting with `= + - @ \t \r` with a single quote or space. Example helper: `const esc = (v) => { const s = String(v ?? ""); const g = /^[=+\-@\t\r]/.test(s) ? "'" + s : s; return '"' + g.replace(/"/g, '""') + '"'; };` and build each row with `esc()`.
- **Screenshot reference:** N/A - code-level.

### BUG-003 - `/api/parse-receipt` is unauthenticated and unbounded (High / P1)
- **Description:** `app/api/parse-receipt/route.ts` `POST` reads `ocrText` and calls Gemini with the server's `GEMINI_API_KEY`. There is **no user/session check**, no rate limiting, and no payload-size cap. Anyone who can reach the endpoint can spend the project's Gemini quota (cost + DoS). Additionally, the response builder trusts `item.category` verbatim (`category: item.category || "Other"`) with **no server-side enforcement** of the 10 allowed categories from the system prompt, so arbitrary category strings can flow downstream.
- **Steps to reproduce:** `curl -X POST http://<host>/api/parse-receipt -H 'content-type: application/json' -d '{"ocrText":"..."}'` from any unauthenticated client (with real Gemini key configured).
- **Expected result:** Endpoint requires an authenticated session, rate-limits per user, caps input size, and validates categories against the whitelist.
- **Actual result:** Open endpoint that proxies to a paid AI API for any caller; no category validation.
- **Suggested fix:** Create a Supabase server client in the route, call `supabase.auth.getUser()`, and return 401 if no user. Add an input length cap and per-user rate limiting. Intersect returned categories with the allowed set and coerce unknowns to `"Other"`.
- **Screenshot reference:** N/A - code-level.

### BUG-004 - "Delete account" leaves the auth user intact (High / P1)
- **Description:** `deleteAccount` in `app/(app)/settings/page.tsx` runs `supabase.from("profiles").delete().eq("id", user.id)` then `supabase.auth.signOut()`. It relies on DB cascade to remove profile-linked rows, but the **Supabase auth user record is never deleted** (client SDK + anon key cannot delete auth users; that requires a service-role admin call). There is also no re-authentication step before this destructive action.
- **Steps to reproduce (code-level):** Read the function; note it never calls an admin/`deleteUser` server route.
- **Expected result:** Account deletion removes the auth identity (via a server route using the service-role key) after re-auth confirmation, freeing the email for future signup.
- **Actual result:** Data rows removed via cascade, but the login identity persists silently; the email cannot be reused and a "deleted" user can still authenticate.
- **Suggested fix:** Add a server route (service-role key, never exposed to the client) that verifies the session, requires recent re-authentication, and calls `auth.admin.deleteUser(userId)` before cascading data deletion. Keep the two client-side confirm dialogs but back them with the server call.
- **Screenshot reference:** N/A - code-level.

### BUG-005 - Raw backend error messages surfaced to users (Medium / P2)
- **Description:** Login (`setError(error.message)`), signup (`setError(signupError.message)` / `profileError.message`), new-transaction (`setError(insertError.message)`) render Supabase/Postgres error strings directly. This can leak schema/constraint/implementation detail and is poor UX.
- **Steps to reproduce (code-level; live blocked):** Trigger a failing auth/insert; observe the raw message in the red error box.
- **Expected result:** Friendly, generic user-facing messages; technical detail logged server-side only.
- **Actual result:** Verbatim provider error text shown in the UI.
- **Suggested fix:** Map known error codes to friendly copy and fall back to a generic "Something went wrong, please try again." Log the raw error to the console/telemetry, not the DOM.
- **Screenshot reference:** N/A - code-level.

### BUG-006 - Silent data-load failures / stuck loading state (Medium / P2)
- **Description:** Every authenticated page uses `useEffect(() => { loadData(); }, [])` where `loadData` checks only `if (…Res.data) setState(…)` and calls `setLoading(false)` on the success path. If a query errors, `error` is ignored, state stays empty, and (on transactions/dashboard/budgets/settings) `setLoading(false)` still runs but nothing distinguishes "no data" from "load failed". On scan/new-transaction, `if (!user) return;` leaves the page silently inert. There is no cleanup and errors are unhandled.
- **Steps to reproduce (code-level):** Inspect `loadData` in dashboard/transactions/budgets/settings and `loadCategories` in scan/new-transaction.
- **Expected result:** Distinct loading, empty, and error states; retry affordance on failure.
- **Actual result:** Query failure is indistinguishable from empty data; possible false-empty UI; no error feedback.
- **Suggested fix:** Destructure `{ data, error }`, render an error state with a retry button on failure, and keep the existing empty-state UI only for genuinely empty results. Error/empty blocks should be semantic (`<section role="alert">` for errors) and responsive.
- **Screenshot reference:** N/A - code-level.

### BUG-007 - Double-submit race can create duplicate records (Medium / P2)
- **Description:** In `app/(app)/transactions/new/page.tsx`, `handleSubmit` sets `loading` true but then `await supabase.auth.getUser()` before the insert; the button's `disabled={loading}` does reduce risk, yet add-category (`app/(app)/settings/page.tsx`) and add-budget (`app/(app)/budgets/page.tsx`) submit handlers do not disable the button before their awaits in the same way (add-category has no `saving`/disabled guard at all), so a rapid double-click before React re-renders can fire two inserts.
- **Steps to reproduce (code-level; live blocked):** Double-click "Add" quickly on the category form.
- **Expected result:** Second click is ignored until the first completes.
- **Actual result:** Two inserts possible; duplicate category/budget/transaction rows.
- **Suggested fix:** Set a `submitting` flag synchronously at the top of each handler and gate both the button `disabled` state and an early `if (submitting) return;` guard; reset in `finally`.
- **Screenshot reference:** N/A - code-level.

### BUG-008 - Raw `<img>` used for receipt preview (Medium / P3)
- **Description:** `app/(app)/scan/page.tsx` (~line 234) renders `<img src={imagePreview} … />`. Lint confirms `@next/next/no-img-element`. No optimization/lazy behavior; larger LCP and bandwidth.
- **Steps to reproduce:** `npm run lint` → 1 warning at `scan/page.tsx:234:13`.
- **Expected result:** Optimized image handling or an explicit, justified exception.
- **Actual result:** Raw `<img>`; lint warning.
- **Suggested fix:** For blob/object-URL previews, either use `next/image` with `unoptimized` or keep `<img>` but add an ESLint disable comment with justification, plus explicit `width`/`height` to avoid layout shift and a descriptive `alt`. Preserve responsive Tailwind sizing (`max-h-48 mx-auto rounded-lg`).
- **Screenshot reference:** N/A - code-level (lint output).

### BUG-009 - 7 dependency vulnerabilities (6 high) including Next.js middleware-bypass advisories (High / P1)
- **Description:** `npm audit` reports **7 vulnerabilities (1 low, 6 high)**: numerous Next.js advisories (Middleware/Proxy bypass, cache poisoning, CSP-nonce XSS, image-optimization DoS, SSRF via Server Actions/rewrites), plus high-severity `brace-expansion`, `js-yaml`, `nanoid`, transitive `postcss`, and `@babel/core` arbitrary file read. The Next.js middleware-bypass class is especially relevant since this app depends on middleware for auth gating.
- **Steps to reproduce:** `npm audit`.
- **Expected result:** No high-severity advisories in production dependencies.
- **Actual result:** 6 high + 1 low; fixes available via `npm audit fix` (some transitive).
- **Suggested fix:** Run `npm audit fix` for the transitive advisories, then treat the Next.js upgrade as a deliberate step, not a drop-in patch. Note that the full `npm audit fix --force` remediation reports it "Will install next@16.3.3, which is outside the stated dependency range" - that is a **breaking major/minor bump** that requires a full `npm run build` and `npm run lint` re-verification (and a middleware/proxy regression check) rather than a clean patch. Pin to the lowest patched version that resolves the high-severity advisories, re-run build/lint, and add `npm audit` (or Dependabot/Renovate) to CI to prevent regressions.
- **Screenshot reference:** N/A - CLI output.

### BUG-010 - Money handled as floating-point Number (Medium / P2)
- **Description:** Amounts are stored/summed as JS `Number` and formatted with `toFixed(2)` in `lib/utils.ts`. Repeated `+` accumulation over many transactions can accrue binary floating-point error (classic `0.1 + 0.2 !== 0.3`), so displayed totals may be off by a cent.
- **Steps to reproduce (code-level):** Sum many fractional amounts client-side.
- **Expected result:** Exact currency math.
- **Actual result:** Potential sub-cent rounding drift in totals/budgets/dashboard.
- **Suggested fix:** Compute in integer minor units (cents) or use a decimal library; keep DB type `NUMERIC(12,2)` (already correct) and round only at display time.
- **Screenshot reference:** N/A - code-level.

### BUG-011 - Over-broad route matching via `startsWith` (Low / P2)
- **Description:** `protectedPaths.some(p => pathname.startsWith(p))` and the same for `authPaths` mean `/dashboardx`, `/settings-help`, `/loginfoo` all match a prefix and inherit protected/auth-redirect behavior.
- **Steps to reproduce (code-level):** Inspect `lib/supabase/middleware.ts`.
- **Expected result:** Exact segment matching.
- **Actual result:** Unintended paths are treated as protected/auth routes.
- **Suggested fix:** Match on exact path or path-segment boundaries, e.g. `pathname === p || pathname.startsWith(p + "/")`.
- **Screenshot reference:** N/A - code-level.

### BUG-012 - Icon-only controls lack accessible names (Low / P2)
- **Description:** In `app/(app)/layout.tsx` the mobile hamburger `<button>` toggles `Menu`/`X` with no `aria-label` and no `aria-expanded`. Delete (`Trash2`) and close (`X`) icon buttons across transactions/budgets/settings/scan rely at best on `title` (only some have it). lucide SVG icons are decorative but not marked `aria-hidden`, so screen readers may announce them.
- **Steps to reproduce (code-level; live a11y blocked by BUG-001):** Inspect the buttons; navigate with a screen reader.
- **Expected result:** Every interactive control has an accessible name; decorative icons are hidden from AT.
- **Actual result:** Unlabeled buttons; hamburger state not exposed.
- **Suggested fix:** Add `aria-label` (e.g. `"Open menu"`/`"Close menu"`) and `aria-expanded={mobileMenuOpen}` to the hamburger; add `aria-label="Delete"` etc. to icon buttons; add `aria-hidden="true"` to decorative icons; add a visible `focus-visible:ring-2` to icon buttons. Keep controls as semantic `<button>` elements with responsive Tailwind sizing.
- **Screenshot reference:** N/A - blocked/code-level.

### BUG-013 - Timezone-sensitive date bucketing (Low / P3)
- **Description:** `getMonthKey` uses `date.getFullYear()/getMonth()` (local time), while DB `date` values are `YYYY-MM-DD` strings that `new Date("YYYY-MM-DD")` parses as **UTC midnight**. In negative-UTC-offset zones this can shift a transaction into the previous day/month, misassigning it in dashboard month filters (`t.date.startsWith(currentMonth.slice(0,7))`) and the daily line chart (`new Date(t.date).getDate()`).
- **Steps to reproduce (code-level):** Compare `getMonthKey` (local) with `new Date("2025-03-01").getDate()` (UTC) in a UTC-5 environment.
- **Expected result:** Consistent date handling independent of client timezone.
- **Actual result:** Possible off-by-one month/day for some users.
- **Suggested fix:** Treat `date` strings as plain calendar dates: parse with explicit UTC or compare the raw `YYYY-MM-DD` substrings without constructing `Date` in local time.
- **Screenshot reference:** N/A - code-level.

### BUG-014 - Deprecated `middleware` file convention (Low / P3)
- **Description:** Next 16.2.4 warns on both build and dev: `The "middleware" file convention is deprecated. Please use "proxy" instead.` (confirmed live in server logs).
- **Steps to reproduce:** `next build` or `next dev`; read the warning.
- **Expected result:** No deprecation warnings.
- **Actual result:** Warning emitted each run.
- **Suggested fix:** Migrate `middleware.ts` to the `proxy` convention per the linked Next.js guide, keeping the same session/auth logic.
- **Screenshot reference:** N/A - CLI output.

### BUG-015 - OAuth `next` redirect param not allow-listed (Low / P3)
- **Description:** `app/auth/callback/route.ts` reads `next` from the query and redirects to `` `${origin}${next}` ``. Because `next` is interpolated *after* `origin`, even a protocol-relative payload like `next=//evil.com` resolves to `https://<host>//evil.com`, which is a same-origin path, so this is **not** an external open redirect. The residual risk is scoped to internal-path redirection only: `next` is otherwise unvalidated, so a crafted value can bounce an authenticated user to any arbitrary internal route rather than the intended `/dashboard`. Hardening is recommended.
- **Steps to reproduce (code-level):** Inspect the route; note `next` used without an allow-list.
- **Expected result:** `next` validated against an allow-list of known internal paths (default `/dashboard`).
- **Actual result:** Any internal path is accepted (cross-origin redirection is already prevented by the `origin` prefix).
- **Suggested fix:** Validate that `next` starts with a single `/` (not `//`) and matches a known route prefix; otherwise fall back to `/dashboard`.
- **Screenshot reference:** N/A - code-level.

### BUG-016 - Amount inputs lack robust numeric validation (Low / P3)
- **Description:** `parseFloat(amount)` (new-transaction) and `parseFloat(e.target.value) || 0` (scan) rely on HTML5 `min`/`step` only. There is no max bound and no explicit NaN handling before the DB layer; the DB `CHECK (amount > 0)` is the sole real guard, and a `NaN` insert would fail with a raw error (see BUG-005).
- **Steps to reproduce (code-level):** Inspect amount handling in `transactions/new` and `scan`.
- **Expected result:** Client validates numeric range and rejects NaN/negative/unbounded values with a friendly message.
- **Actual result:** Relies on browser + DB constraint; edge inputs surface as raw errors.
- **Suggested fix:** Parse and validate explicitly (finite, > 0, sensible max) before insert; show inline validation copy.
- **Screenshot reference:** N/A - code-level.

### BUG-017 - Loading flag never resets on the `!user` early return, stranding the UI (Medium / P2)
- **Description:** Three submit handlers set a busy flag and only afterwards check for a session, returning early without clearing it:
  - `app/(app)/transactions/new/page.tsx` `handleSubmit`: `setLoading(true)` then `const { data: { user } } = await supabase.auth.getUser(); if (!user) return;` - `setLoading(false)` is only reached on the insert-error path, so a null user leaves the Save button permanently `disabled` with the "Saving..." label.
  - `app/(app)/scan/page.tsx` `handleSave`: `setStep("saving")` then `if (!user) return;` - the page is stuck on the "Saving transactions..." spinner with no error step and no way back.
  - `app/(app)/settings/page.tsx` `saveProfile`: `setSaving(true)` then `if (!user) return;` - the Save button stays disabled showing "Saving...".
  This is distinct from BUG-006 (silent load-time failures) and BUG-007 (double-submit race): it is a submit-time stuck-state that occurs specifically when the session expires between page load and submit.
- **Steps to reproduce (code-level; live blocked by BUG-001 + missing creds):** Inspect each handler; note the busy flag is set before the `if (!user) return;` guard and is never reset on that branch. To trigger: let the session expire, then submit the form.
- **Expected result:** On a missing/expired session the handler resets the busy flag, surfaces a friendly "Your session has expired, please sign in again" message, and/or redirects to `/login`.
- **Actual result:** The button is permanently disabled or the spinner is stranded; the user gets no feedback and cannot retry without a full page reload.
- **Suggested fix:** Reset the busy flag before returning (e.g. `if (!user) { setLoading(false); setError("Your session has expired. Please sign in again."); return; }`), or wrap the whole handler in `try/finally` that clears the flag; in `scan`, transition to the existing `"error"` step instead of returning. Render any new error copy in a semantic `<div role="alert">` with responsive Tailwind utilities to match the existing error styling.
- **Screenshot reference:** N/A - code-level.

---

## 4. UX Improvement Suggestions

1. **Zero-config failure is the worst possible first run (ties to BUG-001).** Ship a `.env.example`, a README setup section, and a graceful "configuration required" screen instead of a blanket 500.
2. **Distinct empty vs. error vs. loading states (BUG-006).** Users currently cannot tell a failed load from genuinely empty data. Add retry affordances.
3. **Friendly error copy (BUG-005).** Replace raw provider errors with human messages; keep success toasts consistent (settings uses a green banner; other pages just navigate away with no confirmation).
4. **Delete-account clarity (BUG-004).** After fixing the auth-deletion gap, tell the user exactly what is removed and confirm completion.
5. **Signup 2-step flow feedback.** Step 1 "Continue" only advances local state; there is no validation that the email is unique or the password meets policy until final submit. Consider validating step 1 before advancing and showing a step indicator (currently only the subtitle changes).
6. **Budgets "Total Spent" vs "Total Budget" conflation (`app/(app)/budgets/page.tsx`).** `totalSpent` sums *all* monthly expense transactions regardless of whether a matching budget row exists, while `totalBudget` sums only categories that have a defined budget. So a user who budgets one category but spends across several sees Total Spent exceed Total Budget (and turn red via `totalSpent > totalBudget`) even when no budgeted category is actually over its limit, conflating unbudgeted spending with over-budget. Consider either summing only expenses whose category has a budget for an apples-to-apples comparison, or relabeling the cards (e.g. "Total Spent (all categories)") so the comparison is not misread.
7. **Filters usability (transactions).** No result-count feedback when filters produce zero rows beyond the generic empty state; a "clear filters" is present but the active-filter state isn't summarized.
8. **Charts empty states (dashboard).** Pie and line charts already handle empty data with a message, but the bar chart always renders even with all-zero data - consider a consistent empty state.
9. **Reduced-motion.** Spinners, chart animations, and OCR progress ignore `prefers-reduced-motion`; honor it for accessibility and comfort.
10. **Currency formatting.** `formatCurrency` uses a symbol + `toFixed(2)` for all currencies, so JPY (no minor units) shows `¥100.00`. Use `Intl.NumberFormat` per currency.
11. **Consistency.** Success feedback, button loading labels, and confirmation dialogs (native `confirm`/`alert`) vary across pages; native dialogs are not styleable and break the visual theme - consider an in-app modal (semantic `<dialog>` or an accessible modal component with responsive Tailwind).

---

## 5. Security Findings

- **[Critical] Configuration crash exposes 500s on all routes (BUG-001).** Beyond UX, a blanket 500 can leak stack traces in dev and signals a fragile trust boundary. Fail closed and gracefully.
- **[High] Unauthenticated AI endpoint (BUG-003).** `/api/parse-receipt` has no auth, rate limit, or size cap - direct cost/DoS exposure on the Gemini key, plus no server-side category whitelist.
- **[High] Incomplete account deletion (BUG-004).** Auth identity persists after "delete account"; no re-auth on a destructive action.
- **[High] Dependency vulnerabilities (BUG-009).** 6 high advisories including Next.js middleware/proxy-bypass and cache-poisoning classes that directly undermine the middleware-based auth gate.
- **[Medium] CSV/formula injection (BUG-002).** User-controlled notes/categories exported unescaped.
- **[Medium] Backend error disclosure (BUG-005).** Raw Supabase/Postgres messages rendered to users.
- **[Low] Internal-path redirect hardening for OAuth `next` param (BUG-015).** The `origin` prefix already blocks cross-origin redirects; the residual risk is unvalidated internal-path redirection.
- **[Low] Over-broad `startsWith` route gating (BUG-011).**
- **Positives confirmed:**
  - RLS is enabled on `profiles`, `categories`, `transactions`, `budgets` with `auth.uid()`-scoped `FOR ALL` policies (`supabase/schema.sql`) - the anon key being public is by design; RLS is the real guard and it is present for all four tables.
  - Passwords use `type="password"` (masking) on login and signup.
  - React auto-escapes rendered values; **no `dangerouslySetInnerHTML`** anywhere in the app (grep-verified), so reflected/stored XSS via rendered fields is mitigated by default.
  - DB CHECK constraints (`amount > 0`, `type` enum) provide server-side backstops.
  - Session/token handling is delegated to Supabase SSR cookies via middleware (appropriate pattern once env is configured).

---

## 6. Accessibility Findings

- **[BUG-012] Unlabeled icon-only controls & hamburger.** No `aria-label`/`aria-expanded` on the mobile menu toggle; delete/close icon buttons lack consistent accessible names; decorative lucide SVGs lack `aria-hidden`.
- **Focus indicators are partial.** Text inputs use `focus:ring-2 focus:ring-ring` (good), but icon buttons and some nav links rely on default outlines removed by Tailwind resets in places; add `focus-visible:ring-2` to all interactive controls.
- **Color-only status signaling.** Budget progress bars and amount coloring (green income / red expense) convey meaning by color alone (dashboard, budgets, transactions). Add text/`aria-label` (e.g. "83% used" text exists on budgets - good; replicate the pattern and add non-color cues for income/expense).
- **Color contrast.** `text-muted-foreground` on `bg-card`/`bg-secondary/50` and the small `text-xs` muted labels should be verified against WCAG AA (4.5:1 for body text); several muted-on-tinted combinations are borderline.
- **Reduced motion.** Spinners (`animate-spin`), chart animations, and the OCR progress bar do not respect `prefers-reduced-motion`.
- **Keyboard navigation / tab order (code-level; live blocked by BUG-001).** Forms are standard semantic controls with `<label htmlFor>` associations (good). The mobile menu overlay is absolutely positioned and not focus-trapped; Escape does not close it.
- **Alt text.** The receipt `<img>` has `alt="Receipt preview"` (present); decorative SVG icons need `aria-hidden`.
- **Semantic HTML (steering-rule check): PASS overall.** Pages use `<main>`, `<header>`, `<nav>`, `<section>`, `<article>`, `<footer>`, `<ul>/<li>`, and labeled form controls. Minor gap: native `confirm`/`alert` dialogs are not accessible/stylable; the mobile overlay `<nav>` should be a landmark with a labeled toggle.

---

## 7. Performance Findings

- **[BUG-008] Unoptimized `<img>` receipt preview** - no lazy/optimization, larger LCP/bandwidth; also a source of layout shift (no explicit dimensions).
- **Client-side OCR on the main thread (`lib/ocr.ts`).** Tesseract.js runs `recognize` in the browser; large receipts and the canvas preprocessing loop (`preprocessImage` iterates every pixel) block the main thread and can freeze the UI on big images. Consider a Web Worker and downscaling before OCR (a 2000px cap exists, which helps).
- **Bundle weight.** Tesseract.js and Recharts are both heavy. Recharts loads eagerly on the dashboard; consider dynamic `import()` / code-splitting the scan (Tesseract) and dashboard (Recharts) routes so the landing/auth bundles stay light.
- **Layout shift from async data + charts.** Dashboard renders a spinner then swaps in cards/charts with no reserved height, causing CLS; reserve chart container heights (the `ResponsiveContainer height` is fixed, which helps, but the summary cards/spinner swap is not reserved).
- **Duplicate/again-on-refresh fetches.** Each authenticated page refetches all data on mount with no caching layer (`useEffect(…, [])`); navigating between dashboard/transactions/budgets re-queries overlapping data (profile, transactions, categories) every time. Consider a shared client cache (e.g. React Query/SWR) or Supabase query dedup.
- **Live latency observed [fake-creds]:** first landing render ~1.9s cold (Turbopack compile), then ~40ms warm; acceptable for dev, but the eager Recharts/Tesseract imports will dominate real bundle size.

---

## 8. Production Readiness Score

**Score: 34 / 100**

**Justification:**
- **Blocking (drags the score to the floor):** The app returns **HTTP 500 on every route** in its shipped state (no env vars, no `.env.example`) - it is not runnable out of the box for anyone who clones it (BUG-001). This alone is disqualifying for production without a fix.
- **Security gaps:** an unauthenticated AI endpoint that spends real money (BUG-003), incomplete account deletion leaving auth identities behind (BUG-004), 6 high-severity dependency advisories including Next.js middleware-bypass (BUG-009), and CSV/error-message exposure (BUG-002, BUG-005).
- **Reliability/UX gaps:** silent data-load failures (BUG-006), double-submit races (BUG-007), stuck submit UI on session loss (BUG-017), floating-point money (BUG-010), timezone date drift (BUG-013).
- **Credit where due (keeps it above ~30):** the build compiles cleanly with zero type errors, lint is essentially clean (1 warning), RLS is correctly defined for all tables, auth-gating logic is correct once the client can be built (verified via the 307 redirects under fake creds), passwords are masked, there is no `dangerouslySetInnerHTML`, and semantic HTML + responsive Tailwind are used consistently. The architecture is sound; the defects are fixable and mostly localized.
- Because the majority of end-to-end functionality is **Blocked** (unverifiable without credentials) and the one thing that *is* fully verifiable - that the app boots - **fails**, the score sits in the "major work required before it can even be evaluated in production" band.

---

## 9. Final Recommendation

**Needs Major Fixes**

The application cannot serve a single page in its shipped state (BUG-001 Critical/P0), ships no environment documentation, exposes an unauthenticated paid AI endpoint, deletes accounts incompletely, and carries multiple high-severity dependency advisories. These must be resolved and the credential-gated flows (auth, all CRUD, receipt scan) must be re-tested end-to-end with real Supabase/Gemini credentials before any production consideration. The underlying architecture (App Router + Supabase RLS + client CRUD) is fundamentally sound, so once the P0/P1 items are fixed and the Blocked flows are verified, a re-audit could plausibly reach "Ready with Minor Fixes."
