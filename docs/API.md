# ReactPulse - API notes

## Upstream service

Every reaction request is handled by the public Sasa Dev endpoint:

```
GET https://sasa-dev-api.xyz/api/wa-channel-reacts?url=<post>&emojis=<e1,e2>&apikey=<Sasa_Dev_Api_*>
```

| Parameter | Required | Notes |
|---|---|---|
| `url` | ✅ | Full WhatsApp Channel post link |
| `emojis` | ✅ | Comma separated, **max 6** |
| `apikey` | ✅ | Sent as the `apikey` query parameter **or** the `X-API-Key` header |

Observed response shapes (all include `creator: "Sasa Dev"`):

```json
{ "status": true,  "creator": "Sasa Dev", "poweredBy": "SASA DEV APIS" }
{ "status": false, "error": "Invalid API Key.", "creator": "Sasa Dev" }
{ "status": false, "error": "Missing API Key.", "creator": "Sasa Dev" }
```

Keys are issued at <https://sasa-dev-api.xyz> after signing in; new accounts get a
7-day / 500-request trial. Keys look like `Sasa_Dev_Api_xxxxxxxxxxxx`.

CORS is open (`access-control-allow-origin` echoes the caller's origin), but
**ReactPulse deliberately proxies the call through its own server** so the key is
never shipped to the browser.

## ReactPulse endpoints

### `POST /api/boost`
Body: `{ "url": string, "emojis": string[] }` — see README for the full response.

### `GET /api/channel/info?url=<channel link>`
Real channel data from WhatsApp (name, followers, description, avatar flag) plus
the current block state. Returns `503 wa_offline` when no WhatsApp session is linked.

### `POST /api/channel/verify/start` · `{ url }`
Issues a one-time ownership code (`@Sasa_Reaction_3822`), a `manageToken` and a
30 minute expiry, and stores the request in `database/verifications.json`.

### `POST /api/channel/verify/confirm` · `{ url, code, manageToken?, action? }`
Re-reads the channel description **fresh** (bypassing the metadata cache) and
compares it with the issued code. On a match the channel is marked
`verifiedOwner: true` and `blocked: true` (or `false` when `action: "unblock"`).

### `POST /api/channel/unblock` · `{ url, manageToken }`
Owner-side unblock. Requires the manage token issued when the channel was blocked.

### `GET /api/channels/blocked?q=&limit=`
Public list of blocked channels (name, followers, who blocked it, when).

### `POST /api/track/visit`
Counts one visit per browser session into `database/visits.json`. Bots and
monitors are ignored. IPs are hashed/masked, never stored raw.

### `GET /api/stats/public`
Public counters for the website: total reactions, reactions today, requests,
blocked channels, visitors, verified channels.

### `GET /api/settings/public`
Announcement text, maintenance state and the public limits (max emojis).

### `GET /api/whatsapp/status`
`{ status, linked, demo, me, lastError, cachedChannels }` — used by the blocking page.

### `GET /api/health`
`{ server, route, hasKey, engine, upstream, whatsapp, database, checkedAt }` — cached for 60 s.

### `GET /api/ping`
`{ ok: true, pong: <timestamp>, service: "reactpulse", creator: "Sasa Dev" }`

### Admin API
Everything under `/api/admin` (login, overview, channels, reactions, visits,
activity, settings, password, whatsapp, sessions, export, db flush) is documented
in [`ADMIN.md`](ADMIN.md).

## Server-side validation

| Check | Rule |
|---|---|
| URL | must match `https?://(www.)?(whatsapp.com\|wa.me\|api.whatsapp.com)/…` |
| Emojis | 1–6 unique values, each a single extended-pictographic sequence |
| Body size | 32 kB max |
| Rate limit | 30 requests / minute / IP (per server instance) |
| Upstream timeout | 30 s (health check: 12 s) |
| Blocked channels | refused with `403 channel_blocked` before anything is sent upstream |
| Maintenance mode | refused with `503 maintenance` |
| Channel lookups & verification | same per-IP limiter, `429 rate_limited` |
