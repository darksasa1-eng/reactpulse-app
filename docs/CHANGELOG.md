# Changelog

## 2.2.0 - the encrypted source vault

* The repository is public, but the source is **encrypted inside it**: every file
  under `src/`, `server/`, `scripts/`, `index.html` and `vite.config.js` is
  committed as a `.enc` blob (AES-256-GCM, per-file scrypt-derived key, `RPENC1`
  header, authenticated - a tampered blob is rejected instead of decrypted).
* `tools/encrypt-sources.mjs` publishes the blobs, `tools/decrypt-sources.mjs`
  runs as `prebuild` / `prestart` so Render builds from a readable tree. Missing
  or wrong `SOURCE_KEY` stops the build with a clear message instead of shipping
  a broken app.
* `SOURCE_KEY` lives in the Render environment (and in the git-ignored
  `.source-key` file locally). Nothing in the repository contains it.
* CI decrypts with the `SOURCE_KEY` repository secret, and skips the build steps
  with a notice when the secret is not configured.
* Verified end to end: fresh clone -> `npm install` -> `npm run build` (13 routes)
  -> `npm run check:routes` -> `npm start`, and a Render deploy of the encrypted
  tree that went live in 35 seconds.
* Still readable on purpose: `package.json`, `package-lock.json`, `tools/`,
  `docs/`, `render.yaml`, `database/` and `public/` - npm, Render and browsers
  need them before any of our code runs.

## 2.1.0 - 2026-09-21
### Design — "studio" layer
- New design layer `src/styles-v3.css`: glass panels, hairline borders with a
  light top edge, layered depth, large radii, gradient page heroes, tabular
  figures and restrained motion. The palette is unchanged (deep navy, black,
  white, one blue accent) in both themes.

### Pages rebuilt
- **/boost** is a boost studio: the form lives in a glass studio panel next to a
  three-step guide, a protected-route explainer with the real request shape and
  a help panel; limits and troubleshooting sit side by side below.
- **/block-channel** is an ownership flow: a live three-step stepper tracks your
  progress, the channel review card shows the real name, followers, picture and
  description read from WhatsApp, the ownership code has a live expiry
  countdown, and blocked channels render as a proper sortable-looking table.
- **/status** is a live service board: overall state banner, latency, uptime
  percentage, next-check countdown, per-service rows, a 24-check history strip,
  data counters and the raw JSON response on demand. Auto refresh every 30 s.
- **/contact** leads with the real support details - support.sasadev@gmail.com
  and +94 78 416 7385 - as tappable tiles with copy buttons, a WhatsApp chat
  link and a pre-filled mail form.
- **Control room**: sidebar navigation with counts, KPI grid (CPU and memory
  with gauges), sticky table headers, restyled sign-in screen.

### WhatsApp linking
- The QR image is gone. Linking a device now uses a **pairing code**: enter the
  number in international format, press *Get pairing code*, and type the eight
  character code into WhatsApp -> Settings -> Linked devices -> Link a device ->
  *Link with phone number instead*. The panel shows a live expiry countdown and
  a copy button; `POST /api/admin/whatsapp/pair` backs it.

### Fixed
- `block`/`boost` step lists kept their legacy absolute-positioned markers, which
  collapsed the text into a narrow column inside panels.
- The empty `kv-list` painted a filled band when a section had no rows.
- The JSON mirror notice on /status no longer appears when the mirror is simply
  disabled (for example on a local run without GITHUB_TOKEN).

## 2.0.1 - 2026-09-21
### Fixed
- One canonical URL per page in production: `/boost/` 301s to `/boost` (and the
  same for every other page) instead of `express.static`'s directory redirect.
  `/block` and `/channels` are 301s to `/block-channel`, resolved before static
  files, and the old alias directories are removed at build time.
- The scraper guard now runs **before** the canonical-host redirect, so a
  blocked crawler gets a 403 immediately rather than a redirect it would follow,
  and only real browser navigations (`Accept: text/html`) are redirected.
- Browser-navigation header checks no longer touch sub-resources: CSS, JS, fonts
  and images from a real browser were being refused with a JSON body.
- Clean paths map to their prerendered page; everything else returns the
  prerendered 404 page with a real 404 status.

### Changed
- More than 30 blocked requests a minute parks an address for 10 minutes
  (`BOT_GUARD_BAN_MINUTES`), visible in Admin -> System -> Scraper guard.
- Mobile header: under 800px the tagline is hidden and the call to action moves
  into the menu, so nothing overflows at 390px.
- The admin control room renders outside the public layout (no site navbar or
  footer) and is served the bare `dist/app-shell.html`, kept noindex.

## 2.0.0 - 2026-09-21
### Design
- Complete redesign of every page on a new design system: deep navy + black +
  white with a single blue accent, new type scale, softer elevation, refreshed
  navbar, hero, cards, forms, tables, FAQ, footer and admin control room.
- Dark **and** light themes recoloured to match; hero mock rebuilt.

### Custom domain
- `reactpulse.sasatech.online` is the canonical host. `onrender.com`, `www.`
  and plain `http://` document requests 301 to it; machine calls (health,
  keepalive, API) answer on every host.

### Security
- Hardened response headers: strict CSP without inline scripts, HSTS
  (preload), frame denial, COOP/CORP, Permissions-Policy, Referrer-Policy,
  no X-Powered-By. The pre-paint theme script moved to `/theme-init.js` so the
  CSP needs no `'unsafe-inline'`.
- New scraper guard: allows search engines, link previews and uptime monitors;
  blocks 103 AI crawler / SEO scraper / headless browser / CLI agents; honeypot
  paths; per-IP rate limits for HTML and API; 15 minute IP bans; live counters
  in the admin panel and at `/api/botguard`.
- `/.well-known/security.txt`, `/humans.txt`, admin `X-Robots-Tag` on every
  response, real `404.html` in production, `/database/*` blocked.

### Anti-sleep
- `server/lib/keepAlive.js` self heartbeat plus `GET /api/keepalive`, surfaced
  in Admin → System → Anti-sleep watchdog.
- `.github/workflows/keepalive.yml` pings the service every 10 minutes with an
  automatic fallback host.

### SEO
- Build time prerender: all 13 routes ship as static HTML with their own title,
  description, canonical, OG/Twitter tags and JSON-LD (WebSite,
  SoftwareApplication, HowTo, FAQPage, AboutPage, BreadcrumbList).
- `src/seo/routes.js` is the single source of truth; `sitemap.xml` is generated.
- robots.txt rewritten for the AI era (search engines in, AI + scrapers out),
  new 1200x630 PNG OG image, PWA icons + manifest shortcuts.

### Docs
- New: `docs/SECURITY.md`, `docs/SEO.md`, `docs/KEEPALIVE.md`, `docs/DESIGN.md`.
- README, render.yaml and `.env.example` updated with the new variables.

## 1.1.0 - 2026-09-21
### Added
- **Channel blocking** with owner verification (`/block-channel`): one-time code
  (`@Sasa_Reaction_3822` style) checked against the live channel description
  before a channel is blocked. Blocks are enforced in `POST /api/boost`.
- **Live channel metadata** (name, followers, profile picture, description) read
  from WhatsApp through a Baileys session with JSON auth state, plus a proxied
  avatar endpoint.
- **Hidden admin control room** at `/sasa-admin-society`: email + password login
  (scrypt + signed session cookie), overview metrics, 14-day chart, top emojis
  and channels, channel management (block / unblock / delete), reaction log,
  CPU + RAM + uptime, JSON database panel with GitHub mirror status, WhatsApp
  QR pairing, settings, password change and session revocation.
- **JSON database** in `database/*.json`: atomic writes, 300 ms debounced flush,
  GitHub mirror (commit per change, restore on boot), export endpoint, seed and
  self-check scripts, `database/README.md` schema documentation.
- **Dark / light theme toggle** in the header and admin panel, stored per browser.
- Visitor tracking (`POST /api/track/visit`), public stats endpoint, site
  announcement / maintenance banner, per-IP rate limits on channel lookups and
  verification, audit trail of every important action.
- New docs: `docs/ADMIN.md`, `docs/CHANNEL-BLOCKING.md`.

### Changed
- `server/index.js` is now a thin composition root; the API moved into
  `server/routes/public.js` and `server/routes/admin.js`.
- Booster surfaces blocked channels, maintenance mode and rate limits with
  dedicated messages.
- Health endpoint reports the WhatsApp session and database state.
- Footer, sitemap, i18n (EN + Sinhala) updated for the new pages.

## 1.0.0 - 2026-09-21
- Initial public release of **ReactPulse**
- Reaction booster for WhatsApp Channel posts (up to 6 emojis) via the Sasa Dev API
- Secure server-side API key proxy (`/api/boost`) with rate limiting and validation
- Live request console, progress bar, raw JSON response viewer
- English + Sinhala language toggle, stored in local storage
- Black & white design system, hand-drawn SVG icon set (no emoji used as icons)
- Pages: Home, Boost, How it works, FAQ, API, Status, About, Contact, Sitemap, 404
- Legal: Terms of Service, Privacy Policy, Disclaimer
- SEO: per-page meta, Open Graph, Twitter cards, robots.txt, sitemap.xml, PWA manifest
- Render blueprint (`render.yaml`) + deployment guide (EN / Sinhala)
