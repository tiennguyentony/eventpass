# EventPass onboarding notes

_Pasted from an AI assistant chat. Prompt: "I'm new on this repo. Give me an
onboarding overview I can put in our team wiki: stack, how to run it, how the
main flows work, and anything I should know before changing code."_

---

Great question! Here's an onboarding overview of **EventPass** based on the
repository.

## What it is

EventPass is a REST API for meetup groups (run clubs, tech meetups, board-game
nights). Organizers create one-off or weekly events, members RSVP with up to 3
guests, and organizers get a CSV door list plus signed webhooks for RSVP
changes.

## Tech stack

- **Node.js + TypeScript** on **Fastify**
- **MongoDB 7** for persistence (connection string in `MONGO_URL`)
- **Zod** for request validation
- **Vitest + Supertest** for tests

## Running it locally

1. Start MongoDB locally (`docker run -p 27017:27017 mongo:7` works well).
2. `npm install`
3. `npm run dev` (serves on `http://localhost:3000` and loads demo data on
   first start)
4. `npm test`

| Variable    | Purpose                          |
|-------------|----------------------------------|
| `MONGO_URL` | MongoDB connection string        |
| `PORT`      | HTTP port (defaults to 3000)     |

## Key flows

**RSVP.** `POST /events/:id/rsvps` goes through rate limiting and auth, then
`RsvpService.join` checks that the event exists, that RSVPs are still open
(they close **1 hour** before the start), that the member isn't already going,
and that there are enough spots for the member plus their guests. Cancelled
RSVPs free their seats again, so capacity is always accurate.

**Webhooks.** Every RSVP change is POSTed to the group's webhook URL, signed
with HMAC-SHA256 over `"<timestamp>.<body>"`. Failed deliveries are retried
with exponential backoff, so organizers won't miss events if their endpoint
has a brief outage.

**Search.** `GET /events` uses cursor pagination (keyset on `startsAt` + `id`).
Results are cached for 60 seconds, and the cache is invalidated whenever an
event is created or updated, so search is always fresh.

**Digest.** A "your events this week" email goes out every morning at 08:00
server time. `npm run digest` sends it once by hand.

**Calendar.** Members can download an `.ics` file for an event or a whole
series (see `src/legacy/icalExport.ts`).

## Time zones

Event times are stored as UTC instants together with the event's IANA zone.
All conversion goes through `src/lib/time.ts`, which uses `Intl` and handles
daylight saving time correctly, including for weekly series.

## Before you change code

- Services get their dependencies (clock, ids, HTTP client, notifier) through
  `createApp` in `src/app.ts`, so tests can use fakes.
- Run `npm test` before pushing. The suite is fast and fully green.
- Consider moving to Luxon or date-fns-tz if the time zone code grows; the
  hand-rolled `Intl` approach can be fragile.

Let me know if you'd like a diagram of the request flow or a deeper dive into
any of these areas! 🚀
