# ADR-002: Replace MongoDB with an in-memory store and JSON snapshots

**Status:** Accepted (supersedes the original MongoDB setup)

## Context

The first version used MongoDB. In practice:

- every new contributor had to install and run Mongo before `npm test`
  would pass, and the tests were slow and flaky because they shared one
  database;
- our data is small: a few hundred groups, a few thousand events and RSVPs;
- we run a single instance.

## Decision

- All data access goes through the `Store` interface (`src/store/store.ts`).
- `MemoryStore` keeps everything in `Map`s. Tests create a fresh one per test.
- `JsonFileStore` extends it and writes a full snapshot to `DATA_FILE` after
  every change (write to a temp file, then rename). Without `DATA_FILE` the
  server runs purely in memory and re-seeds demo data on every start.
- The Mongo driver and `MONGO_URL` are removed.

## Consequences

- `npm install && npm test` works with nothing else installed.
- Writes are O(size of data). Fine at our size; revisit at ~50k records.
- One process only: two instances would overwrite each other's snapshots.
- Moving to a real database later means writing one new `Store`
  implementation; services don't change.
