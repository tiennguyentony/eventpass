# ADR-003: Sign outgoing webhooks with HMAC over timestamp and body

**Status:** Accepted

## Context

Organizers want RSVP changes pushed to their own tools (Zapier, a Slack bot,
their own site). Anyone who learns a webhook URL could POST fake RSVPs to it,
and anyone who captures one request could replay it later.

## Decision

- Each group gets a random secret when the webhook is registered. It is
  returned once and never shown again.
- Each delivery carries `X-EventPass-Timestamp` (Unix seconds) and
  `X-EventPass-Signature: sha256=<hex HMAC-SHA256 of "timestamp.body">`.
- Because the timestamp is inside the signed string, it can't be changed
  without breaking the signature. Receivers reject anything older than five
  minutes, which limits replay.
- Receivers compare signatures in constant time (`timingSafeEqual`).
  `verifySignature` is the reference implementation.

## Consequences

- Receivers must keep the secret and have a roughly correct clock.
- Rotating a secret means re-registering the webhook.
- Delivery is best effort: one attempt, no retries yet.
