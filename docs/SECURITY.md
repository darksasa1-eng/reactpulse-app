# ReactPulse security model

Everything below is implemented in this repository - no external security
service, no third-party WAF subscription. It runs on a single free Render
instance and still covers the whole OWASP "top 10 for web apps" surface that a
public tool like this can have.

---

## 1. Transport & headers

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | see table below | stops XSS, injection, data exfiltration |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | no downgrade to http |
| `X-Content-Type-Options` | `nosniff` | no MIME confusion |
| `X-Frame-Options` + `frame-ancestors` | `DENY` / `'none'` | clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | no URL leakage |
| `Cross-Origin-Opener-Policy` | `same-origin` | process isolation |
| `Cross-Origin-Resource-Policy` | `same-origin` | no cross-site hotlinking of responses |
| `Permissions-Policy` | camera, mic, geo, usb, payment … all `()` | unused APIs denied |
| `X-Powered-By` | removed | no fingerprinting |

### The Content-Security-Policy

```
default-src 'self'
script-src  'self'                        <- no inline script, no CDN, no eval
style-src   'self' 'unsafe-inline' fonts.googleapis.com
font-src    'self' data: fonts.gstatic.com
img-src     'self' data: blob: pps.whatsapp.net
connect-src 'self'                         <- the browser never calls the API
frame-src   'none'            frame-ancestors 'none'
base-uri    'self'            form-action 'self'      object-src 'none'
upgrade-insecure-requests     block-all-mixed-content
```

Two consequences worth knowing:

* **The pre-paint theme script is a separate file** (`public/theme-init.js`) so
  `script-src` can stay inline-free. That is why there is no `'unsafe-inline'`
  in `script-src` - the most common CSP weakness is simply not there.
* **`connect-src 'self'`** means that even if someone managed to inject script
  into a page, it could not phone home with your API key: the browser would
  refuse the connection to any other origin. The API key lives only in the
  server environment and is attached server-side.

---

## 2. Scraper / bot guard  (`server/lib/botGuard.js`)

| Layer | Behaviour |
|---|---|
| Search crawlers | Googlebot, Bingbot, DuckDuckBot, Yandex, Applebot … **allowed** (they bring visitors) |
| Uptime monitors | UptimeRobot, Pingdom, StatusCake, healthchecks.io … **allowed** (they keep the app awake) |
| Link previews | WhatsApp, Facebook, Twitter, Telegram, Slack, Discord … **allowed** (shared links must unfurl) |
| AI crawlers | GPTBot, ClaudeBot, PerplexityBot, CCBot, Bytespider, Google-Extended, Meta-ExternalAgent, Amazonbot … **403** |
| SEO / audit scrapers | AhrefsBot, SemrushBot, MJ12bot, DotBot, BLEXBot, Screaming Frog … **403** |
| Headless browsers | Puppeteer, Playwright, Selenium, headless Chrome … **403** |
| CLI / library agents | curl, wget, python-requests, aiohttp, httpx, Go-http-client, Java, okhttp, node-fetch, Scrapy, HTTrack … **403** |
| No user agent at all | **403** |
| Fake Googlebot (no `Accept` header) | **403** |
| Honeypot paths | `/wp-login.php`, `/phpmyadmin`, `/.env`, `/.git`, `/actuator`, `/cgi-bin`, `/shell` … **404** |

Repeat offenders (>30 blocked requests a minute) get their IP **parked for 10
minutes** (still a 403, no data). `BOT_GUARD_BAN_MINUTES` overrides the length.
Counters are in memory only - the guard never writes to the JSON database, so it
cannot be used to fill your storage.

Live counters: `GET /api/botguard` and Admin → **System → Scraper guard**.

### Rate limits

| Surface | Limit |
|---|---|
| HTML pages | 240 requests / minute / IP |
| JSON API | 90 requests / minute / IP |
| `POST /api/boost` | `RATE_LIMIT_PER_MINUTE` (default 30) / IP / minute |
| Channel lookups + verification | same boost limiter |
| Admin login | 5 wrong passwords = 5 minute IP lock |
| Honeypot / bot burst | 30 hits/minute = 10 minute IP ban |

Serve `429` with `Retry-After: 60` and `X-RateLimit-*` headers.

---

## 3. Application security

* **The API key never reaches the browser.** The React app calls our own
  `/api/boost`; the server adds `apikey=` and talks to Sasa Dev. There is no
  client-side key, no `.env` in the build, and the CI workflow fails if a
  `Sasa_Dev_Api_*` string ever appears in a tracked file.
* **Admin panel** at `/sasa-admin-society` (configurable via `ADMIN_PATH`):
  scrypt password hashes, signed `HttpOnly` + `SameSite=Strict` cookies (12 h),
  CSRF-free by design (`SameSite=Strict`, JSON-only body, no cross-site form
  posts), per-route session check, session list + revoke, and full audit trail.
* **Owner verification is a real proof of control**, not a claim: the one-time
  code must appear in the live channel description, read fresh from WhatsApp
  with the 30 minute cache bypassed.
* **Manage tokens** are 32 random bytes; only the SHA-256 digest is stored.
* **No SQL, no file uploads, no template evaluation** - the JSON database is the
  only storage and it is written through a single validated code path.
* **Input validation everywhere**: channel URLs are parsed and restricted to
  WhatsApp channel hosts, emoji input is matched against a palette, body size is
  capped at 64 KB, and every handler answers with a stable error `code`.
* **Crash safety**: unhandled rejections are logged, the JSON writer is atomic
  (tmp file + rename), and secrets are never written to logs.

## 4. Privacy

* IP addresses are hashed (salted SHA-256) for unique counting and masked
  (`203.0.113.x`) in logs - never stored in full.
* Visitor records carry a browser session id, a coarse user agent family and a
  country-less timestamp. No cookies for visitors, no fingerprinting.
* Nothing is sold or shared; the only outbound call is the boost request you
  asked for, to `sasa-dev-api.xyz`.

## 5. Reporting a problem

`support.sasadev@gmail.com` (also published at
`/.well-known/security.txt`). Please include the URL, the request and the time.

## Source vault (encrypted repository)

The code repository is public on purpose (Render builds it on every push), so
the application source itself is encrypted inside it:

* `tools/crypto.mjs` - AES-256-GCM, with a scrypt-derived key per file and a
  `RPENC1` magic header so a foreign or tampered blob is rejected on sight.
* `tools/encrypt-sources.mjs` - writes `src/**/*.js.enc` and friends.
* `tools/decrypt-sources.mjs` - runs as `prebuild` and `prestart`, so Render
  always builds from a decrypted tree; it is idempotent and fails closed when
  `SOURCE_KEY` is missing or wrong.
* `SOURCE_KEY` is stored as a Render environment variable (secret). It is not in
  the repository, not in the git history of this feature and never logged.

What this does and does not protect:

| Protected | Not protected |
| --- | --- |
| Reading or copying the source from GitHub | The minified JS a browser downloads |
| Reusing the project as a starting point | Screenshots and rendered HTML |
| Accidental secret leaks in source diffs | Anyone who holds `SOURCE_KEY` |

Commit history from before 2.1.0 still contains the readable v2 source; a
history rewrite is possible but breaks every clone (and Render's checkout), so
it is deliberately left alone.
