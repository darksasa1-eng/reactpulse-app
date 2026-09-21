# ReactPulse admin control room

```
https://<your-app>.onrender.com/sasa-admin-society
```

* The path is configurable with `ADMIN_PATH` and is **never linked** from the
  public site (no navigation entry, excluded from the sitemap, `noindex` header
  and noindex meta tag are sent for it).
* Sign in with the credentials from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. No
  password is hard-coded in the source: if `ADMIN_PASSWORD` is not set, a strong
  one is generated on first boot and printed once in the Render logs
  (dashboard -> Logs -> look for `admin password`). Change it in Settings.
* Sessions last 12 hours, are stored in `database/sessions.json` and can be
  revoked from the **Sessions** tab. Five wrong passwords lock an IP for five
  minutes.

---

## What is on the dashboard

### Overview
| Metric | Source |
|---|---|
| Total reactions / today | `database/stats.json` (incremented on every successful boost) |
| Requests + success rate | `stats.json` (total vs failed) |
| Visitors / today / unique | `database/visits.json` (`POST /api/track/visit`, one per browser session, bots filtered) |
| Blocked channels, unblocks | `database/channels.json` + `stats.json` |
| Owner verifications (issued / confirmed / pending) | `database/verifications.json` |
| Verified channels | channels with `verifiedOwner: true` |
| CPU load + process CPU | `os.loadavg()` and `process.cpuUsage()` (real numbers from the container) |
| Memory | `os.totalmem()` / `os.freemem()` plus process RSS, heap and external |
| 14-day chart | visits + reactions per day, straight from the JSON files |
| Top emojis, top channels | aggregated from `database/reactions.json` |
| Recent activity | `database/activity.json` (audit trail) |

### Channels
* Search / filter by state, see followers, block reason, who blocked it and when.
* **Unblock** any channel with one click (writes `blocked: false` + audit entry).
* **Block** any channel manually - admin blocks skip owner verification.
* **Delete** a channel record entirely.
* Verification request table: code, channel, status, IP, time.

### Reactions
Rolling log of the last 5000 booster requests: time, channel, emojis, status,
latency, upstream job id and masked IP. Clearable.

### System
* CPU model, cores, load average (1/5/15m), CPU % bars for the container and the process.
* Memory bars (system and process), Node version, platform, hostname, uptimes.
* JSON database panel: collection sizes, GitHub mirror state (last sync, last
  commit sha, last error) and a **Flush now** button that forces `database/*.json`
  to disk *and* pushes them to GitHub.
* **Export JSON** downloads the whole database.
* WhatsApp data service card: status, linked account, cached channels, pairing code
  for pairing, connect / disconnect / log out buttons.
* Endpoint cheat sheet.

### Settings
| Setting | Effect |
|---|---|
| Maintenance mode | `/api/boost` answers 503 with your message; the site shows a banner |
| Enforce blocked channels | master switch for the blocking layer |
| Require owner verification | if off, blocks no longer need the description code (not recommended) |
| Rate limit / minute | per IP, applied to boost + channel lookups |
| Max emojis | 1-6, enforced server side |
| Maintenance message / announcement | free text shown to visitors |
| Change admin password | scrypt hash written to `database/admins.json`, all sessions revoked |

---

## Linking WhatsApp (for real channel names, followers and pictures)

Channel metadata is private to WhatsApp, so the site needs one paired session:

1. Open the dashboard → **System** → **WhatsApp data service**.
2. Type the number (international format, e.g. `94784167385`) and press
   **Get pairing code**.
3. On a spare phone: WhatsApp → **Settings → Linked devices → Link a device**.
4. On the phone open WhatsApp -> **Settings -> Linked devices -> Link a
   device -> Link with phone number instead** and type the eight character code
   shown on screen. The badge flips to **whatsapp linked** and the linked number
   (jid) appears.
5. That is it - the owner-block page can now read real channel data.

Notes:

* The session is stored as JSON in `database/wa-session.json` and mirrored to
  GitHub, so a Render redeploy does **not** ask for a new pairing code.
* One spare number is plenty; the session is only used to *read* public channel
  metadata.
* **Log out** deletes the session (`database/wa-session.json` becomes `{}`) and
  the next visit to the WhatsApp card asks for a new pairing code.
* Until a session exists the blocking page still works, it simply explains that
  live channel data is temporarily unavailable.

---

## API used by the dashboard

All under `/api/admin` and protected by the session cookie:

| Method | Path | Purpose |
|---|---|---|
| POST | `/login` | email + password |
| POST | `/logout` | destroy session |
| GET | `/me` | session check (used by the SPA on load) |
| GET | `/overview` | every dashboard number |
| GET | `/channels?q=&status=&limit=` | channel records |
| POST | `/channels/block` | manual block |
| POST | `/channels/:key/unblock` | unblock |
| DELETE | `/channels/:key` | delete record |
| GET / DELETE | `/reactions` | read / clear the reaction log |
| GET | `/visits` | visitor history |
| GET | `/activity` | audit trail |
| GET / POST | `/settings` | read / update settings |
| POST | `/password` | change password |
| GET | `/whatsapp` · POST `/whatsapp/connect` · POST `/whatsapp/disconnect` · POST `/whatsapp/clear-cache` | session control |
| GET | `/sessions` · DELETE `/sessions/:id` | session management |
| GET | `/export` | full database dump |
| POST | `/db/flush` | force disk write + GitHub sync |
