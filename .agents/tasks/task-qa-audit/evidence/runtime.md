# Runtime Evidence — Console & Network

Captured via headless Chromium (Playwright-core 1.63.0 driving /opt/playwright chromium-1232)
against the production server (`next start`, Next.js 16.2.4) at http://127.0.0.1:3000.
Raw per-viewport data: `runtime.json` (same directory).

## Scope exercised
- Route `/` loaded at three viewports (mobile 375x667, tablet 768x1024, desktop 1440x900)
  in light mode, plus desktop 1440x900 in dark mode (`prefers-color-scheme: dark` emulated).
- Keyboard Tab traversal recorded on desktop/light.
- The app has exactly one route (`/`); there are no other pages, no forms, no client state.

## Browser console
- **No console messages of any kind** on any viewport or in dark mode: 0 errors, 0 warnings,
  0 logs. (`console: []` for all four captures.)
- **No uncaught page errors** (`pageerrors: []` everywhere).
- **No hydration warnings** and no Next.js dev overlay warnings (production build was used, and
  nothing was emitted to the console regardless).

## Network requests
- **Every request returned HTTP 200.** No 404, no 500, no failed requests, no CORS errors.
  (`requestfailed: []` for all captures.)
- Document `/` → 200 (text/html).
- Static assets confirmed loading:
  - `/next.svg` → 200 (Next.js logo, used with `priority`)
  - `/vercel.svg` → 200 (Vercel logomark on the Deploy Now CTA)
  - `/favicon.ico?...` → 200 (favicon loads; served with a cache-busting query string)
- Framework assets (all 200): one CSS chunk (`_next/static/chunks/*.css`), the Turbopack
  runtime chunk, several JS chunks, and two self-hosted `next/font` Geist `.woff2` files
  under `_next/static/media/`.
- Total requests per load: ~14 (1 document + 1 CSS + ~8 JS chunks + 2 fonts + 2 SVGs + favicon).
- All assets are same-origin; no third-party/CDN requests were made (fonts are self-hosted by
  `next/font`), so there is no external network dependency at runtime.

## Keyboard focus order & focus indicators (desktop/light)
Tab order (source order, no `tabindex` overrides):
1. **Templates** text link — `href=https://vercel.com/templates...`, `target=null`, `rel=null`
2. **Learning** text link — `href=https://nextjs.org/learn...`, `target=null`, `rel=null`
3. **Deploy Now** CTA — `href=https://vercel.com/new...`, `target=_blank`, `rel="noopener noreferrer"`
4. **Documentation** CTA — `href=https://nextjs.org/docs...`, `target=_blank`, `rel="noopener noreferrer"`
5. Focus returns to body (end of focusable elements).

- **Visible focus indicator present on all four links**: each focused anchor reports
  `outline-style: auto`, `outline-width: 1px` (browser default focus ring). No element
  suppresses the outline. Outline color adapts (dark ring on light CTA, light ring on dark CTA).
- **Confirmed link-behavior asymmetry (as expected):** the two in-paragraph text links
  (Templates, Learning) have **no** `target` and **no** `rel`, so they navigate in the same tab;
  the two CTA anchors (Deploy Now, Documentation) open in a new tab with
  `target=_blank rel="noopener noreferrer"`. See `runtime.json → anchors`.

## Layout / responsiveness observations (from screenshots)
- `qa-screenshots/mobile-375x667.png` — content centered, single column, CTAs stacked
  (the `sm:` / `md:` utilities keep the mobile layout centered and stacked).
- `qa-screenshots/tablet-768x1024.png` — left-aligned layout engages at the `sm:` breakpoint;
  CTAs sit in a row.
- `qa-screenshots/desktop-1440x900.png` — left-aligned, max-width container (`max-w-3xl`),
  content vertically distributed; CTAs in a row.
- `qa-screenshots/desktop-dark-1440x900.png` — dark theme applied via `prefers-color-scheme: dark`:
  black background, inverted (white) Next.js logo and Vercel mark, light text. Confirms the
  dark-mode CSS variables and `dark:` utilities work.
- No layout shift or overflow was observed; the logo uses `priority` and fixed width/height
  (100x20) which avoids image-driven CLS.

## Notes
- Server used: production `next start` (chosen so there is no dev overlay / HMR noise, giving a
  clean read of real runtime behavior). The dev server (`next dev`) also started cleanly and
  reported "Ready" on http://localhost:3000.
