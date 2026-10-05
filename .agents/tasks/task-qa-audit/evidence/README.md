# QA Audit — Evidence Index (FEAT-001)

Raw evidence gathered for the QA audit of `kiro-web-playground` (Next.js 16.2.4, single
static landing page at `/`). The written report is produced separately in FEAT-002; this
directory contains only artifacts.

## Environment
- node v22.23.3, npm v11.4.2 (PATH-prepended from `/root/.nvm/versions/node/v22.23.3/bin`).
- `npm install` added 427 packages. `node_modules` now present.
- Browser automation: Playwright-core 1.63.0 driving system Chromium at
  `/opt/playwright/chromium-1232/chrome-linux64/chrome` (`--no-sandbox`).

## Artifacts

| File | What it is | One-line summary |
|------|------------|------------------|
| `build.log` | `npm run build` full output + timing | **PASS** — compiled in ~1.5s, TypeScript OK, 4 static pages generated, total ~4.4s, exit 0. No warnings. |
| `lint.log` | `npm run lint` full output | **PASS** — eslint (next core-web-vitals + typescript) clean, exit 0, zero warnings/errors. |
| `runtime.md` | Human-readable console + network + focus summary | **Zero console messages, zero page errors; every network request HTTP 200; favicon + both SVGs load; focus visible on all 4 links.** |
| `runtime.json` | Machine-readable per-viewport capture backing `runtime.md` | Responses, console, pageerrors, requestfailed, focus order, and anchor target/rel for 3 light viewports + 1 dark. |
| `headers.log` | `curl -I` for `/`, `/next.svg`, `/favicon.ico` + analysis | All 200. **All six security headers ABSENT** (CSP, X-Frame-Options, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). `X-Powered-By: Next.js` present. |

## Screenshots (`../../../../qa-screenshots/`)
Located at `/projects/sandbox/kiro-web-playground/qa-screenshots/`:
- `mobile-375x667.png` — mobile, light, centered single column.
- `tablet-768x1024.png` — tablet, light, left-aligned layout engages.
- `desktop-1440x900.png` — desktop, light, max-width container.
- `desktop-dark-1440x900.png` — desktop, `prefers-color-scheme: dark`, inverted logo/dark bg.

## Key findings at a glance
1. **Build**: success, no warnings, exit 0 (`build.log`).
2. **Lint**: clean, exit 0 (`lint.log`).
3. **Console**: no errors, no warnings, no hydration warnings (`runtime.md`/`runtime.json`).
4. **Network**: all requests 200; no 404/500/failed/CORS; favicon and SVGs load.
5. **Headers**: no security headers set; `X-Powered-By` leaks framework (`headers.log`).
6. **Keyboard a11y**: logical Tab order (Templates → Learning → Deploy Now → Documentation),
   browser default `outline: auto` focus ring visible on all four links.
7. **Link behavior**: text links lack `target`/`rel`; CTAs use `target=_blank rel="noopener noreferrer"`.
8. **Responsive/dark mode**: layouts render correctly at all three widths and in dark mode.
