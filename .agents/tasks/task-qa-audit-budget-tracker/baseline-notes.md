# Budget Tracker QA Audit — Environment Baseline (FEAT-001)

Setup + static baseline capture for the Personal Budget Tracker app. No application
source was modified. This file records the runnable state and the first QA findings
that later live/manual testing (FEAT-002) will build on.

## Source under audit

- Branch: `origin/feature/budget-tracker`, checked out locally as `qa-budget-tracker`.
- HEAD commit: `d563b5edd90ab59e8c092bc456c64306110de97b` (matches the audit target).
- `main` is only a stock create-next-app starter; the real app lives on the feature branch.
- Confirmed app source present, e.g. `app/(app)/dashboard/page.tsx`.

## Toolchain

- Node **v22.23.2** (via nvm; not on default PATH — all node/npm commands run through `bash -lc`).
- npm **11.4.2** (npm notes a newer 12.0.2 is available; not required).
- Next.js **16.2.4** (Turbopack), React 19, TypeScript 5, Tailwind CSS v4.

## `npm install`

- Result: **SUCCESS.** 489 packages added, 490 audited in ~14s. No peer-dependency
  errors (React 19 / lucide-react / recharts ^3 / tesseract.js ^7 all resolved cleanly).
- **`npm audit`: 7 vulnerabilities (1 low, 6 high).** These are supply-chain/security findings:
  - `next` (multiple high advisories: middleware/proxy bypass, cache poisoning, XSS via CSP nonce, DoS in image optimization, SSRF via Server Actions/rewrites, etc.). Current 16.2.4 sits inside the vulnerable range per advisories.
  - `brace-expansion` (high, DoS) — transitive via eslint tooling.
  - `js-yaml` 4.0.0–4.3.0 (high, quadratic DoS).
  - `nanoid` <=3.3.17 (high, infinite loop on negative/zero size).
  - `@babel/core` <=7.29.0 (arbitrary file read via sourceMappingURL) — transitive.
  - `postcss` (transitive, pulled by next).
  - Fixes available via `npm audit fix` (and `--force` for the rest); not applied in this
    setup-only feature. Flag for the Security Findings section.

## `npm run build`

- Result: **SUCCESS.** Compiled in ~3.7s, TypeScript checked (no type errors), 13 static
  pages generated. Routes:
  - Static (`○`): `/`, `/_not-found`, `/budgets`, `/dashboard`, `/login`, `/scan`,
    `/settings`, `/signup`, `/transactions`, `/transactions/new`.
  - Dynamic (`ƒ`): `/api/parse-receipt`, `/auth/callback`, plus the Proxy (Middleware).
- **Finding (Low/warning):** build emits `⚠ The "middleware" file convention is deprecated.
  Please use "proxy" instead.` — Next.js 16.2.4 wants the `proxy` convention; `middleware.ts`
  is deprecated. See https://nextjs.org/docs/messages/middleware-to-proxy.
- Note: the auth-gated pages are client components and their static prerender does NOT invoke
  Supabase at build time, so the build passes even with env vars absent. The Supabase
  failure surfaces at **runtime via middleware** (see Dev server below).

## `npm run lint`

- Result: **1 problem — 0 errors, 1 warning.**
  - `app/(app)/scan/page.tsx:234:13` — `@next/next/no-img-element`: uses raw `<img>` instead
    of `next/image`; may hurt LCP/bandwidth. (Consistent with the global steering preference
    for optimized, responsive UI.)
- No `react-hooks/exhaustive-deps`, `no-explicit-any`, or missing-alt errors were reported by
  the configured eslint flat config (`eslint.config.mjs`). Deeper hook/dependency review is a
  code-review item for FEAT-002.

## Dev server (`npm run dev`)

- Start: **SUCCESS.** `✓ Ready in ~291ms`. Bound to **port 3000**
  (`http://localhost:3000`, network `http://169.254.255.194:3000`). Turbopack.
- Same middleware deprecation warning printed at startup.
- **CRITICAL runtime finding — every route returns HTTP 500 without Supabase env vars:**
  - `GET /` → **500**
  - `GET /login` → **500**
  - `GET /signup` → **500**
  - `GET /dashboard` → **500** (no redirect; errors before the auth-gate redirect can run)
  - Cause: `middleware.ts` matches nearly all paths and calls `updateSession` →
    `createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, ...)`
    in `lib/supabase/middleware.ts:9`. With both vars undefined, supabase-js throws:
    `Error: Your project's URL and Key are required to create a Supabase client!`
  - Impact: with no credentials, NOTHING is reachable at runtime — not even the public
    landing page or the login/signup pages. Live functional/UI/accessibility testing of the
    running app is therefore **Blocked** pending real Supabase credentials. Those items must be
    exercised via code review (or by supplying credentials) in FEAT-002, not marked passed.

## Missing environment variables (expected, documented — do NOT fabricate)

- No `.env.local` and no `.env.example` exist on the branch.
- Undefined:
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase auth + all data CRUD.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase browser/server client.
  - `GEMINI_API_KEY` — receipt AI parsing (`/api/parse-receipt`).
- Consequence: auth (login/signup), all authenticated pages (dashboard, transactions,
  budgets, settings, scan), and receipt AI parsing cannot be exercised end-to-end.
  Additional finding: the app ships no `.env.example`, so there is no documented list of
  required env vars for a developer setting the project up.

## Summary for FEAT-002

| Area | Status |
|------|--------|
| Branch checkout @ target commit | ✅ Done |
| `npm install` | ✅ Success (7 audit vulns: 1 low / 6 high) |
| `npm run build` | ✅ Success (middleware→proxy deprecation warning) |
| `npm run lint` | ✅ 0 errors, 1 warning (`no-img-element` in scan page) |
| `npm run dev` | ✅ Starts on port 3000, but all routes 500 without Supabase env vars |
| Live app testing | 🚫 Blocked at runtime (missing Supabase/Gemini creds) → use code review |

Helper scripts used to launch/probe the dev server live in `.agents/` and are not part of
the app (ignored by the repo's tracking of app source).
