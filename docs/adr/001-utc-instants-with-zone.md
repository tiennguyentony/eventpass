# ADR-001: Store UTC instants plus the event's IANA time zone

**Status:** Accepted

## Context

Our groups meet in London, Berlin and New York, and members travel. Early on
we stored `"2026-11-05 19:00"` strings with no zone and guessed the zone from
the server, which broke as soon as we deployed to a server in UTC.

## Decision

- Every event stores `startsAt` as a UTC instant (ISO string) **and** the IANA
  zone it happens in (`Europe/London`, not `GMT` or `+01:00`).
- Organizers send local wall time + zone; we convert once, on the way in.
- All conversion and formatting goes through `src/lib/time.ts`, which uses
  `Intl.DateTimeFormat`. No date library, and no `getHours()` /
  `toLocaleString()` calls anywhere else.
- Anything that needs "now" takes the injected `Clock`, so tests can pin time.

## Consequences

- Sorting, comparing and "is it in the next 7 days?" are plain string or
  number comparisons on UTC instants.
- Showing a time always needs the event's zone; the DTO adds `localStart` and
  `display` so clients don't have to.
- Anything defined in local terms ("every Thursday at 19:00") has to be
  computed in local time and converted, not computed in UTC.
