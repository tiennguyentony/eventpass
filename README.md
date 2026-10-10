# EventPass

API for meetup groups: run clubs, tech meetups, board-game nights.

Organizers create events (one-off or weekly) for their group. Members find
events through public search and **RSVP**, optionally bringing guests.
Organizers get a CSV door list and can register a **webhook** to hear about
RSVPs in their own tools. Every member gets a daily "your events this week"
email.

## Features

- Groups and events with a time zone, capacity and duration
- Weekly recurring events (a series of up to 26 occurrences)
- RSVP with up to 3 guests; RSVPs close 2 hours before the start
- Public event search with cursor pagination
- Organizer tools: edit events, export attendees as CSV
- Signed webhooks (HMAC-SHA256) on every RSVP change
- Daily digest email: "your events this week"
- Add to calendar (.ics download)
- Rate limiting on RSVP endpoints (10 requests per minute per IP)

## Tech stack

- Node.js + TypeScript, [Fastify](https://fastify.dev)
- MongoDB 7
- Zod for request validation
- Vitest + Supertest for tests

## Getting started

Requirements: Node 22.13 or newer (see `.nvmrc`) and MongoDB running locally.

```bash
npm install
npm run dev                 # http://localhost:3000, demo data loaded on first start
npm test
```

| Variable    | Default                              | Purpose                     |
|-------------|--------------------------------------|-----------------------------|
| `MONGO_URL` | `mongodb://localhost:27017/eventpass` | MongoDB connection string   |
| `PORT`      | `3000`                               | HTTP port                   |

`npm run digest` sends the weekly digest once (it also runs every 24h while
the server is up). In development emails are printed to the console.

## Demo users

Login is email-only for the demo (no passwords).

| Email               | Role                                        |
|---------------------|---------------------------------------------|
| olivia@example.com  | organizer of `grp_runclub` (Hackney Run Club, London) |
| omar@example.com    | organizer of `grp_tsberlin` (TypeScript Berlin)       |
| alice@example.com   | member                                      |
| bob@example.com     | member                                      |
| carol@example.com   | member                                      |
| dave@example.com    | member                                      |

## API

Instants are UTC ISO-8601. When **creating** an event you send the local wall
time and the IANA zone it happens in (`"startsAt": "2027-03-18T19:00"`,
`"timezone": "Europe/London"`). Responses include both the UTC `startsAt` and
the `localStart` / `display` in the event's zone.

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/auth/login` | — | `{ "email" }` → `{ token }` |
| `GET` | `/events` | — | search: `q`, `groupId`, `from`, `limit` (max 50), `cursor` |
| `GET` | `/events/:id` | — | includes `spotsLeft` |
| `POST` | `/groups/:groupId/events` | organizer | optional `repeatWeekly: <count>` |
| `PATCH` | `/events/:id` | organizer | changes one occurrence |
| `GET` | `/events/:id/attendees.csv` | organizer | door list |
| `POST` | `/events/:id/rsvps` | member | `{ "guests": 0-3 }` |
| `DELETE` | `/events/:id/rsvps/:rsvpId` | member | cancel your RSVP |
| `GET` | `/me/rsvps` | member | your upcoming RSVPs |
| `GET` | `/groups`, `/groups/:id` | — | |
| `PUT` | `/groups/:id/webhook` | organizer | `{ "url" }` → `{ url, secret }` |
| `DELETE` | `/groups/:id/webhook` | organizer | |

Send the token as `Authorization: Bearer <token>`. Search responses look like
`{ "items": [...], "nextCursor": "..." }`; pass `nextCursor` back as `cursor`
for the next page.

```bash
curl -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"alice@example.com"}'
curl 'localhost:3000/events?q=5k&limit=5'
```

### Webhooks

Each RSVP change is POSTed to the group's webhook URL as JSON with two headers:

- `X-EventPass-Timestamp`: Unix seconds
- `X-EventPass-Signature`: `sha256=` + hex HMAC-SHA256 of `"<timestamp>.<body>"`
  with the group's secret

Reject requests whose timestamp is more than 5 minutes old.
`verifySignature` in `src/webhooks/signing.ts` shows how.

## Project layout

```
src/
  app.ts            composition root (createApp)
  server.ts         starts the HTTP server and the daily digest
  http/             routes, auth, rate limiting, response shapes
  services/         business logic
  domain/           models and pure rules (RSVP window, capacity, recurrence)
  store/            Store interface and implementations
  webhooks/         signing and delivery
  jobs/             weekly digest
  lib/              clock, ids, time zones, errors, logger, HTTP client
docs/adr/           architecture decision records
tests/              unit + integration tests
```

## Docs

Design decisions are recorded in [`docs/adr`](docs/adr).
