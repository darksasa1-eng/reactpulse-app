# SEO & discoverability

The site is a React SPA, so plain client-side rendering would show crawlers an
empty `<div id="root">`. Instead every route is **prerendered to real HTML at
build time** and the XML sitemap is generated from the same source of truth.

```
npm run build
  ├─ vite build                     -> dist/index.html + hashed assets
  └─ npm run prerender              -> dist/<route>/index.html (13 pages)
        · title, description, canonical, robots, OG, Twitter per route
        · JSON-LD (WebSite, SoftwareApplication, HowTo, FAQPage, Breadcrumb)
        · dist/404.html with a real 404 status
        · dist/sitemap.xml from src/seo/routes.js
```

## What crawlers and social bots see

| Route | Title | Structured data |
|---|---|---|
| `/` | ReactPulse - Boost Reactions on any WhatsApp Channel Post | WebSite + SoftwareApplication |
| `/boost` | Reaction Booster - ReactPulse | SoftwareApplication |
| `/block-channel` | Block Channel - ReactPulse | - |
| `/how-it-works` | How It Works - ReactPulse | HowTo |
| `/faq` | FAQ - ReactPulse | FAQPage (12 questions) |
| `/about` | About - ReactPulse | AboutPage + Organization |
| ... | one HTML file per route, all with their own canonical | BreadcrumbList |

Everything is bilingual-aware (`og:locale en_US` + `og:locale:alternate si_LK`),
`hreflang`-safe because the language toggle changes the copy in place, and the
canonical always points at **https://reactpulse.sasatech.online**.

## Canonical host

`CANONICAL_HOST` (default `reactpulse.sasatech.online`) drives a 301 for any
other host:

* `https://sasa-dev-wa-reacts-web.onrender.com/*` -> `https://reactpulse.sasatech.online/*`
* `http://reactpulse.sasatech.online/*` -> https
* `www.reactpulse.sasatech.online/*` -> the apex custom domain

Only **document requests** are redirected - API calls, health checks and the
keepalive cron keep working on every host so a redirect can never break an
integration.

## robots.txt & AI crawlers

Search engines are welcome. AI crawlers and SEO scrapers are not:

```
User-agent: Googlebot      Allow: /      (Disallow: /api/, /sasa-admin-society)
User-agent: GPTBot         Disallow: /   (and 20 other AI/scraper agents)
User-agent: *              Allow: /  Crawl-delay: 10
Sitemap: https://reactpulse.sasatech.online/sitemap.xml
```

`/sasa-admin-society` is additionally excluded from the sitemap, sends
`X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex`, is never
linked from the UI and every `/api/admin/*` response is `no-store`.

## Performance signals that Google cares about

* Single JS bundle (~109 KB gzip) + one CSS file, both immutable-cached for a year.
* Fonts via `display=swap` with `preconnect`.
* No web font blocking render; the pre-paint theme script is 840 bytes.
* `Cache-Control: no-store` only on API JSON; HTML is `no-cache` (fresh
  prerendered markup) and assets are `max-age=31536000, immutable`.
* Core Web Vitals friendly: no layout shift from fonts (system fallback stack),
  hero is text + CSS only, images are SVG/PNG icons.

## Adding a page later

1. Add the route to `src/seo/routes.js` (path, seo key, priority).
2. Add `meta.<key>` to `src/i18n/en.js` and `src/i18n/si.js`.
3. Add the component + `<Route>` in `src/App.jsx`.
4. `npm run build` - the page, its meta tags and the sitemap entry are all
   generated automatically.

## Search console checklist (do this once)

1. Add the property `reactpulse.sasatech.online` in Google Search Console
   (Domain property, DNS TXT verification).
2. Submit `https://reactpulse.sasatech.online/sitemap.xml`.
3. Request indexing for `/` and `/boost`.
4. Same for Bing Webmaster Tools (it can import from GSC).
5. Keep the keepalive workflow running: a site that answers in <1s gets crawled
   more often than one that cold-starts for 40 seconds.
