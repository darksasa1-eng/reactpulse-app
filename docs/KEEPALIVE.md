# Anti-sleep keepalive (never let the site sleep)

Render's free plan parks a web service after roughly **15 idle minutes**. The
first visitor afterwards waits 30-60 seconds for a cold start. ReactPulse fights
this in three independent ways, so one of them failing is not fatal.

```
┌─ 1 ─ app self-heartbeat ──── every 10 min while awake ──────────┐
│     server/lib/keepAlive.js pings its own /api/ping            │
│     each ping resets Render's idle timer ── 144 req/day        │
└────────────────────────────────────────────────────────────────┘
┌─ 2 ─ external cron ───────── GitHub Actions, every 10 min ─────┐
│     .github/workflows/keepalive.yml -> /api/keepalive          │
│     if the custom domain fails it retries the onrender host    │
└────────────────────────────────────────────────────────────────┘
┌─ 3 ─ your own pinger (optional) ───────────────────────────────┐
│     UptimeRobot / cron-job.org / Better Stack / healthchecks   │
│     https://reactpulse.sasatech.online/api/keepalive           │
└────────────────────────────────────────────────────────────────┘
```

## Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/ping` | ultra light liveness (`{ok:true,pong:...}`), used by Render's health check and the self-ping |
| `GET /api/keepalive` | wakes the service, records the external ping and returns the watchdog status |
| Admin → System → **Anti-sleep watchdog** | beats sent, last beat, external pings, failures |

Example response:

```json
{
  "ok": true, "awake": true, "enabled": true,
  "intervalMs": 600000, "beats": 37, "failures": 0,
  "externalPings": 144, "lastExternalAt": "2026-09-21T07:40:02.113Z",
  "lastBeatAt": "2026-09-21T07:39:01.882Z", "minutesSinceBeat": 1,
  "uptimeSeconds": 21600, "healthy": true
}
```

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `KEEPALIVE` | `1` | `0` disables the internal watchdog |
| `KEEPALIVE_INTERVAL_MS` | `600000` | self-ping interval (10 minutes) |
| `KEEPALIVE_URL` | own `/api/ping` | override the target of the self-ping |

## Why 10 minutes and not 1

* One request every 10 minutes is ~144 a day - invisible in Render's metrics and
  far below any abuse threshold.
* The interval is jittered by up to a minute so traffic never looks machine-perfect.
* Self-pings go to `127.0.0.1` (no external round trip, no bandwidth cost); only
  the GitHub Actions ping crosses the internet.

## Honest limits

* GitHub Actions schedules can be delayed a few minutes under load, and GitHub
  disables scheduled workflows in repositories that see no activity for 60 days.
  If you want a second layer, add the URL to any free uptime monitor - that is
  also your availability alerting.
* Keepalive keeps the app **warm**, it is not a substitute for real traffic.
  Google still prefers a site that answers in milliseconds, which is what the
  prerendered HTML and the CDN cache give you.
* On a paid Render plan `KEEPALIVE=0` is fine - a plan that never sleeps makes
  this whole document optional.
