# Channel blocking & owner verification

## The problem

Anyone can paste a channel link into a reaction booster. A channel owner has no
way to say *"do not send third-party reactions to my channel"*. ReactPulse adds
exactly that - and it is enforced on the server, so it also applies to people
calling the API directly.

## The flow, step by step

```
1. Owner pastes the channel link        POST /api/channel/info
   └─► server reads the REAL channel    name · followers · picture · description
       (via the paired WhatsApp session)

2. Owner presses “Block this channel”   POST /api/channel/verify/start
   └─► server issues a one-time code    e.g.  @Sasa_Reaction_3822
       valid 30 minutes, tied to that channel + IP block

3. Owner pastes the code into the       (done inside WhatsApp, by the owner)
   channel description and saves it

4. Owner presses “Verify & block”       POST /api/channel/verify/confirm
   └─► server re-reads the description FRESH (cache bypassed)
       compares it with the issued code
       match  → verifiedOwner = true, blocked = true, token issued
       no match → clear message, they can retry (attempt counter increments)

5. Every future boost                   POST /api/boost
   └─► blocked channel? 403 channel_blocked, nothing is sent upstream
```

### Why the description proves ownership

Only the owner of a channel can edit its name, picture and description. Asking
them to paste a random code there is a proof they control the channel - the
same technique Telegram and Mastodon use for account verification. Nobody else
can satisfy the check, not even us.

## What the owner gets

| | |
|---|---|
| Verification code | one per request, looks like `@Sasa_Reaction_3822` |
| Expiry | 30 minutes, with a **New code** button |
| Manage token | 32 byte random token, only the SHA-256 hash is stored server side |
| Where the token lives | `localStorage` of the browser that blocked the channel |
| Unblock | one click from "My blocks", or ask the admin (dashboard → Channels → Unblock) |

## Enforcement points

| Layer | What happens |
|---|---|
| `POST /api/boost` (website) | resolves the channel, checks `channels.json`, refuses with `403 channel_blocked` |
| Any other tool calling `/api/boost` | same code path, same refusal |
| The Sasa Dev reaction engine itself | not involved - we simply never send the request |
| Admin panel | can block/unblock/delete records at any time, and the change is live immediately |

## Data written

`database/channels.json`

```json
{
  "key": "0029VaXXXXXXXXXX@newsletter",
  "name": "My Channel",
  "followers": 12045,
  "description": "… @Sasa_Reaction_3822",
  "blocked": true,
  "blockedAt": "2026-09-21T07:12:44.102Z",
  "blockedBy": "owner",
  "verifiedOwner": true,
  "verification": { "code": "@Sasa_Reaction_3822", "verifiedAt": "…", "method": "description" },
  "manageTokenHash": "e3b0c44298fc1c149afbf4c8996fb924…",
  "updatedAt": "2026-09-21T07:12:44.102Z"
}
```

`database/verifications.json` keeps the request trail (code, status, attempts,
masked IP, snapshot of the channel at the time) and `database/activity.json`
records `channel_blocked` / `channel_unblocked` entries for the audit log.

## Edge cases handled

* **Code not saved yet** → `code_not_in_description`, the code stays valid and
  the owner can press Verify again after saving in WhatsApp.
* **Expired code** → `no_pending`, a fresh code is issued on request.
* **Channel already blocked** → the UI says so and points to "My blocks".
* **Another visitor tries to unblock** → `403 forbidden` without the token.
* **WhatsApp data service offline** → blocking is still recorded for existing
  channel keys, and the page explains that live metadata is unavailable.
* **Demo mode** (`WA_DEMO=1`) simulates the owner pasting the code so the whole
  flow can be tested without a real channel.
