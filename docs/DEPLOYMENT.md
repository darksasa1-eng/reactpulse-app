# ReactPulse — Deployment Guide (Render + Cloudflare)

**සිංහල පියවරෙන් පියවර guide එක.** v2 (2026-09-21) අනුව යාවත්කාලීන කරලා.

```
GitHub repo  : darksasa1-eng/reactpulse-app   (code, public, source stored encrypted)
Data repo    : darksasa1-eng/reactpulse-database      (JSON database, PRIVATE)
Live site    : https://reactpulse.sasatech.online
Admin panel  : https://reactpulse.sasatech.online/sasa-admin-society
Render       : sasa-dev-wa-reacts-web (Singapore · free plan) - builds branch main of darksasa1-eng/reactpulse-app
```

> ### 🟢 දැනටම deploy කරලා ඉවරයි
> ඉතුරු වැඩ එකක් විතරයි: **Cloudflare DNS record එක දාන එක** (§0 බලන්න).
> පහළ steps ටික අලුතෙන් service එකක් හදන්න ඕන අවස්ථාවකට සුරකින්න.

---

## 0. Custom domain එක (Cloudflare DNS) — **දැන් කරන්න ඕන එකම දේ**

Domain: **reactpulse.sasatech.online** → Render service: `sasa-dev-wa-reacts-web`

Cloudflare dashboard → **sasatech.online** zone → **DNS → Records → Add record**:

| Type | Name | Target | Proxy status | TTL |
|---|---|---|---|---|
| `CNAME` | `reactpulse` | `sasa-dev-wa-reacts-web.onrender.com` | **DNS only** (grey cloud ☁️) | Auto |

**අනිවාර්යයෙන් කරන්න ඕන දේවල්:**

1. `reactpulse` හෝ root එකට **AAAA record** එකක් තියෙනවා නම් ඒක **අයින් කරන්න** —
   Render IPv6 support කරන්නේ නැහැ, AAAA තිබ්බොත් domain එක verify වෙන්නේ නැහැ.
2. **SSL/TLS → Overview → Encryption mode = `Full`** (Flexible නෙවෙයි!).
3. Render dashboard → service → **Settings → Custom Domains** එකේ
   `reactpulse.sasatech.online` ඉස්සරහා **Verify** ඔබන්න (හෝ මිනිත්තු 2-10ක් ඉන්න, auto verify වෙනවා).
   Status එක **Verified / Certificate Issued** වුණාම site එක `https://reactpulse.sasatech.online`
   එකෙන් වැඩ කරනවා.

රැයි පැයි දෙකක් ඇතුළත, කැමති නම් **Proxy status** එක **Proxied (orange cloud 🟠)** කරන්න.
එතකොට Cloudflare එකේ WAF, Bot Fight Mode, caching ඔක්කොම වැඩ කරනවා (පහළ §0.1).

### 0.1 Cloudflare hardening (Proxied කළාට පස්සේ — recommended)

| # | කොහෙද | කරන්න ඕන දේ |
|---|---|---|
| 1 | Security → **Bots** | **Bot Fight Mode = On** (known bots block) |
| 2 | Security → **WAF → Custom rules** | Rule: `(http.request.uri.path contains "/wp-") or (http.request.uri.path contains "/.env") or (http.request.uri.path contains "phpmyadmin")` → **Block** |
| 3 | SSL/TLS → **Edge Certificates** | **Always Use HTTPS = On**, **HSTS = On** (12 months, include subdomains, preload), Minimum TLS 1.2 |
| 4 | Speed → **Optimization** | **Brotli = On**, **Early Hints = On**, **HTTP/3 = On** |
| 5 | Caching → **Cache Rules** | `/assets/*` → Cache Everything, Edge TTL 1 year · `/api/*` → **Bypass cache** |
| 6 | Security → **Settings** | Security Level = Medium, Challenge Passage = 30 min, **0-RTT = Off** |

> මේවා optional. අපේ server එකේත් CSP, HSTS, bot guard, honeypots, rate limits ඔක්කොම
> දාලා තියෙනවා (`docs/SECURITY.md`), ඒ නිසා DNS only තිබ්බත් site එක ආරක්ෂිතයි.

### 0.2 Site එක වැඩ කරනවද බලන්න

```bash
curl -I  https://reactpulse.sasatech.online/                 # 200 + security headers
curl -s  https://reactpulse.sasatech.online/api/ping         # {"ok":true,...}
curl -s  https://reactpulse.sasatech.online/api/keepalive    # anti-sleep status
curl -s  https://reactpulse.sasatech.online/api/botguard     # blocked bot counters
curl -I  https://sasa-dev-wa-reacts-web.onrender.com/        # 301 -> custom domain
```

---

## 1. GitHub repo එකට code එක දාන්න

```bash
git clone https://github.com/darksasa1-eng/reactpulse-app.git
cd reactpulse-app
# the source is encrypted: build with SOURCE_KEY=<key> npm run build
cp .env.example .env      # .env එකට SASA_API_KEY එක දාන්න (commit කරන්න එපා!)
npm install && npm run build && npm start      # http://localhost:3000
```

`.github/workflows/ci.yml` එක push එකකදීම build + route check කරනවා; API key එකක්
tracked file එකක තිබ්බොත් CI එක fail වෙනවා (secret guard).

## 2. Render එකේ Web Service එක හදන්න

Render dashboard → **New + → Web Service** → repo එක select කරන්න.

| Setting | Value |
|---|---|
| Name | `sasa-dev-wa-reacts-web` |
| Region | Singapore |
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/ping` |
| Instance type | Free |

### Environment variables

| Key | Value | අවශ්‍යද |
|---|---|---|
| `SASA_API_KEY` | `Sasa_Dev_Api_...` | ✅ |
| `NODE_VERSION` | `20.11.1` | ✅ |
| `ADMIN_EMAIL` | ඔබේ login email | ✅ |
| `ADMIN_PASSWORD` | ශක්තිමත් password | ✅ (code එකේ default එකක් නැහැ) |
| `CANONICAL_HOST` | `reactpulse.sasatech.online` | ✅ (301 redirect + SEO) |
| `GITHUB_TOKEN` | Contents: read & write තියෙන fine-grained token | ✅ (data බේරෙන්න) |
| `GITHUB_REPO` | `darksasa1-eng/reactpulse-database` | ✅ |
| `GITHUB_BRANCH` | `main` | ✅ |
| `ADMIN_PATH` | `/sasa-admin-society` | recommended |
| `KEEPALIVE` | `1` | recommended |
| `KEEPALIVE_INTERVAL_MS` | `600000` | optional |
| `BOT_GUARD` | `1` | recommended |
| `RATE_LIMIT_PER_MINUTE` | `30` | optional |
| `MAX_EMOJIS` | `6` | optional |

`render.yaml` එකේ මේවා ඔක්කොම තියෙනවා — **New + → Blueprint** තෝරලා repo එක දුන්නොත්
ඔක්කොම auto-fill වෙනවා.

## 3. JSON Database එක බේරන්න

Render free plan එකේ filesystem එක **ephemeral** — හැම redeploy එකකදීම `database/` folder
එක අලුතෙන් එනවා. ඒ නිසා හැම වෙනසක්ම **private GitHub repo** එකකට mirror කරනවා:

```
database/channels.json  →  (වෙනසක් උනාම 6s කින්)  →  GitHub commit  →  redeploy එකේදී restore
```

1. Data repo: `darksasa1-eng/reactpulse-database` (**private** — visitor stats + hashed password තියෙනවා)
2. Fine-grained token එකක් හදන්න: Repository access = ඒ repo එක විතරයි, Permissions =
   **Contents: Read and write**
3. Token එක Render එකේ `GITHUB_TOKEN` එකට දාන්න
4. Admin → **System → JSON database** කාඩ් එකේ *Last sync / Last commit* පේනවා නම් හරි ✅

## 4. WhatsApp session එක link කරන්න

Channel නම්, followers ගාන, profile picture — ඇත්ත data ඕන නම් එක් number එකක් pair කරන්න ඕන:

1. `/sasa-admin-society` → login → **System** tab
2. **WhatsApp data service** කාඩ් එකේ number එක type කරලා **Get pairing code** ඔබන්න
3. Phone එකේ: WhatsApp → **Settings → Linked devices → Link a device → Link with phone number instead** → screen එකේ පේන 8 character code එක type කරන්න
4. Badge එක **whatsapp linked** වුණාම ඉවරයි (session එක data repo එකට commit වෙනවා → redeploy එකකදී ආයෙ code ඕනේ නැහැ)

## 5. Sleep වෙන්න නොදී තියාගන්න

| Layer | මොකක්ද |
|---|---|
| 1 | App එකේ self-heartbeat — පැයට 6 වතාවක් තමන්ටම ping කරනවා |
| 2 | GitHub Actions cron — 10 මිනිත්තුවකට වතාවක් `/api/keepalive` |
| 3 | (optional) UptimeRobot වගේ monitor එකක් — availability alerting එකත් එක්ක |

විස්තර: [`KEEPALIVE.md`](KEEPALIVE.md) · Admin → System → **Anti-sleep watchdog**

## 6. ආරක්ෂාව + SEO

* Security: [`SECURITY.md`](SECURITY.md) — headers, CSP, bot guard, rate limits, honeypots
* SEO: [`SEO.md`](SEO.md) — prerender, sitemap, structured data, Search Console checklist
* Design: [`DESIGN.md`](DESIGN.md) — නව නිල්/කළු/සුදු palette එකේ tokens

## 7. Update එකක් deploy කරන්න

```bash
git add -A && git commit -m "..." && git push origin main
```

Render එකේ **Auto-Deploy = Yes** නම් push එකෙන්ම deploy වෙනවා (`npm install && npm run build`
→ vite → prerender → node). Data repo එකට වෙන commits වලට `[skip render]` tag එක තියෙන
නිසා ඒවා deploy loop එකක් හදන්නේ නැහැ.

## ප්‍රශ්න ආවොත් (Troubleshooting)

| ලකුණ | හේතුව | විසඳුම |
|---|---|---|
| Site එක "Loading…" එකේ ඉන්නවා | cold start (free plan) | තත්පර 30-60ක් ඉන්න; keepalive වැඩ කරනවා නම් මේක නොවෙන්න ඕන |
| Domain එකෙන් cert error | CNAME වැරදි හෝ AAAA තියෙනවා | DNS records බලන්න (Name = `reactpulse`, DNS only), AAAA අයින් කරන්න |
| onrender.com එකට redirect වෙනවා | `CANONICAL_HOST` set වෙලා නැහැ | Render env var `CANONICAL_HOST=reactpulse.sasatech.online` දාන්න |
| 403 "blocked" පණිවිඩය | ඔබේ tool/browser එක bot ලෙස අඳුනාගත්තා | normal browser එකකින් try කරන්න; අවශ්‍ය නම් `BOT_GUARD=0` |
| "Channel data temporarily unavailable" | WhatsApp session එක link කරලා නැහැ | Admin → System → WhatsApp → Connect |
| Redeploy එකකින් පස්සේ blocked channels නැති | `GITHUB_TOKEN` set කරලා නැහැ | Token එක දාලා redeploy කරන්න |
| Login වෙන්න බැහැ | `ADMIN_PASSWORD` වෙනස් | Render env var එකේ password එක boot එකේදී දිනනවා — env එක update කරන්න |
| Search එකේ පේන්නේ නැහැ | Search Console එකට submit කරලා නැහැ | `docs/SEO.md` checklist එක කරන්න |

## Local development

```bash
cp .env.example .env       # SASA_API_KEY එක දාන්න
npm run seed:db            # database/*.json ටික හදනවා
npm run build              # vite + prerender
npm start                  # http://localhost:3000
```

Test කරන්න `WA_DEMO=1` දාන්න — phone එකක් pair නොකර channel data + block flow එක
සම්පූර්ණයෙන් test කරන්න පුළුවන්. Local එකේදී host redirect එක අවශ්‍ය නැහැ
(`DISABLE_HOST_REDIRECT=1` දාන්නත් පුළුවන්).

## Repository move (2026-09-21)

The site now builds from **darksasa1-eng/reactpulse-app**, a fresh repository
with a single commit: the application source lives there only as encrypted
`.enc` files, so no readable copy exists in any commit. The Render service
`srv-dao3d68473hc73b9jg4g` points at it (`main`, auto-deploy on).

The previous repository `sasa-dev-wa-reacts-web` (which still carried the
readable v2.1.0 history) is **private and archived** - it is no longer part of
the deploy path, and nothing else reads from it. The JSON data lives in the
private mirror repository `darksasa1-eng/reactpulse-database`, which the server
syncs through the GitHub API with `GITHUB_TOKEN`.

Deploying therefore looks like:

```
push to reactpulse-app/main
  -> Render clones the repository
  -> npm install && npm run build        (prebuild decrypts with SOURCE_KEY)
  -> npm start                            (prestart decrypts as well)
  -> https://reactpulse.sasatech.online
```
