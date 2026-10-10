# EventPass exercises

You are joining the EventPass team this week. You have never seen this code
before. Use AI tools (Claude, ChatGPT, Copilot, Cursor, anything you like)
the way you would at work.

What we care about is **how** you work with AI, not how fast you finish:

- what context you give the tool,
- whether you check what it tells you before you believe it,
- when you disagree with it,
- and whether you can explain the result in your own words.

Your interviewer will tell you which exercises to do. You probably won't
finish everything. That's expected. Say what you skipped and why.

## Before you start

```bash
git clone https://github.com/tiennguyentony/eventpass.git
cd eventpass
npm install
npm test            # should be green
npm run typecheck   # should be clean
npm run dev         # API on http://localhost:3000, demo data loaded
```

You need Node 22.13 or newer (`node -v`; `.nvmrc` pins 24). Nothing else
needs to be installed.

**Ground rules**

1. Share your screen, including your AI chat window.
2. Keep your AI conversation. At the end, export or copy it into
   `session/ai-transcript.md` (or share a link).
3. For each piece of AI output you use, be ready to say whether you
   **accepted**, **edited** or **rejected** it, and why.
4. You may run anything, add files and change code. Commit to a branch
   named `session/<your-name>`.

## Warm-up: explore and explain (10–15 min)

Use AI however you like to understand the codebase. Then write
`session/NOTES.md` answering:

1. In two or three sentences: what does this service do, and who uses it?
2. A member sends `POST /events/:id/rsvps`. What happens, step by step,
   until they get a response? Name the files and functions, and every reason
   the request could be refused.
3. What happens **after** the response has been sent? Think about the
   organizer's webhook and the daily "your events this week" digest. When
   does each one run, and what happens if it fails?

Then **close the AI window** and walk your interviewer through your notes.

---

# Part 1: When AI gets it wrong

These tasks are areas where AI tools often give confident, plausible and
wrong answers. Your job is to catch that and prove what is actually true:
with a test, a command, or a line of code you can point at. "The AI said so"
is not proof, and neither is "it looks right".

## 1.1 Review an AI-written pull request (20 min)

A teammate opened PR #42. They used an AI assistant to write it. Read
`review/PR-42-edit-rsvp.md` (the description) and `review/PR-42.diff`
(the code).

1. Review it the way you would on GitHub. You may use AI to help. Write your
   review in `session/review.md`:
   - your decision: **approve**, **comment** or **request changes**;
   - line-specific comments (`src/services/rsvpService.ts` line N: ...),
     each one saying what is wrong, why it matters, and what you'd suggest;
   - which claims in the PR description are true, and which are not.
2. Now apply it and see what happens:

   ```bash
   git apply review/PR-42.diff
   npm run typecheck
   npm test
   ```

   Did anything change your review? What did your AI reviewer miss, and what
   did it flag that wasn't a real problem?

Undo it afterwards with `git apply -R review/PR-42.diff`.

## 1.2 Incident (15 min)

Two messages arrived in the support inbox this morning, from Olivia, who runs
the Hackney Run Club:

> Hi! Our weekly Thursday 19:00 run shows **20:00** for every session from
> April onwards. Members are turning up an hour late and I didn't change
> anything. The March ones are fine.

> Also, not sure if related: the server went down twice yesterday afternoon,
> right after we changed our webhook URL to our new Zapier hook. We changed it
> back and it's been fine since?

1. Find the root cause of each problem. Use AI, but don't stop at its first
   answer.
2. **Prove** each one with a failing test (or, for the second, a reproduction
   you can show). The test should fail now and pass once fixed.
3. Fix whichever one you think matters more. Say why you chose it.

## 1.3 Is it a bug? (15 min)

Three more tickets. For each one, decide: **bug**, **not a bug**, or **need
more information**. Back every decision with evidence (a test, a request you
ran, or the code and docs that explain it). Write your answers in
`session/tickets.md`. If it is a bug, write a failing test. If it is not,
write the reply you would send.

> **T1, from Omar (TypeScript Berlin):** I created a summer event for 15 July
> at 19:00 Berlin time and the API response says
> `"startsAt": "2027-07-15T17:00:00.000Z"`. That's two hours off. Please just
> store the time I send you.

> **T2, from a developer at the run club:** Our receiver puts webhook
> deliveries on a queue and processes them later. Anything that waits more
> than about five minutes fails `verifySignature`. Can you take the timestamp
> out of the signature so they always verify?

> **T3, from Omar:** "TypeScript Night" says 0 spots left and nobody else can
> RSVP, but the room holds 3 and only 2 people are going. Bob cancelled
> yesterday.

T3 is visible in the demo data: start the app and look at `GET /events`.

## 1.4 Check the AI's onboarding notes (15 min)

A teammate asked an AI for an onboarding overview of this repo and wants to
put it in the team wiki. It is in `review/ai-onboarding-notes.md`.

1. Go through it claim by claim. Mark each **true**, **false** or **partly
   true**, and give the file, test, ADR or command that proves it. Write this
   in `session/onboarding-check.md`.
2. Ask your own AI tool to correct the notes. Check its corrected version the
   same way. What did it still get wrong?
3. Which wrong claim would cost a new teammate the most time, and why?

## 1.5 Security pass (10 min)

Ask AI to review the attendee export (`src/services/attendeeExport.ts`), the
webhook code (`src/http/routes/groups.ts`, `src/webhooks/`) and the rate
limiter (`src/http/rateLimit.ts`).

1. Triage what it says: for each finding, **real / not real / not worth
   fixing now**, with one sentence of reasoning.
2. Prove the most serious real one with a test or a `curl` command.

## 1.6 Write the missing tests (15 min)

Public search (`GET /events` in `src/http/routes/events.ts`) caches its
responses in `ListingCache` (`src/http/listingCache.ts`). The only test is
"caches identical queries briefly" in `tests/integration/events.test.ts`.

1. Ask AI to write the tests this cache is missing. Keep them in
   `tests/integration/`.
2. Run them. Is the implementation correct? For each test, say whether it
   checks real behaviour or just restates the code.
3. If you think something is wrong, say what, prove it, and say how you
   would fix it. You don't have to fix it.

---

# Part 2: Build a new feature with AI

**Before you send your first prompt**, write `session/context.md`: what you
will tell the AI about this codebase (conventions, invariants, anything it
shouldn't trust) and your "definition of done". Add a short plan: the steps
you expect, in order. Then use it. Keep commits small. Add tests. You will be
asked how you verified each part, so keep track of what you ran. You will
probably not finish everything: prioritise, and say what you left out.

## 2.1 Small feature: organizer stats (15 min)

Organizers want a quick overview of who is coming.

- New endpoint `GET /groups/:id/stats`, only for the organizer of that group
  (403 for anyone else, 404 for an unknown group).
- Returns `{ "items": [...] }` with one item per **upcoming** event of the
  group, in start order: `eventId`, `title`, `going` (members), `guests`,
  `cancelled`, `spotsLeft`.
- The numbers must agree with each other and with `GET /events/:id`.
- Tests for: organizer sees correct numbers, member gets 403, past events
  are left out.

## 2.2 Medium feature: cancel an event (25 min)

Organizers can mark an event as cancelled.

- Only the organizer of the event's group can cancel it.
- Everyone going gets an email (use the injected `Notifier`; tests can use
  `RecordingNotifier` from `tests/helpers.ts`).
- The event disappears from public search (`GET /events`) **immediately**.
- New RSVPs to a cancelled event are refused with a 409.
- The group's webhook receives an `event.cancelled` delivery, signed like
  the existing ones.
- Tests for each of the above.

## 2.3 Larger feature: waitlist (40 min, or design-only in 15 min)

When an event is full, members can join a waitlist. When someone cancels,
the first person waiting gets the spot and an email.

- A member can join the waitlist of a full event; the response shows their
  position.
- When a going member cancels (`DELETE /events/:id/rsvps/:rsvpId`), the
  first person waiting is moved to going, gets an email, and the group's
  webhook hears about it.
- Waitlisted members don't use seats, aren't on the door list
  (`attendees.csv`), and don't get the digest.
- A member can leave the waitlist.
- Tests for promotion order and for the event never going over capacity.

**Design-only version:** write `session/design.md` instead: the model change
(`RsvpStatus` in `src/domain/models.ts`), where promotion happens, which
existing code paths must change, what could go wrong, and the tests you
would write first.

## 2.4 Teach the next AI (10 min)

Write an `AGENTS.md` (or `CLAUDE.md`) at the repo root, so the next
engineer's AI tool doesn't repeat the mistakes you saw today. Keep it under
40 lines. Only include things that are true and useful.

## 2.5 Pull request description (5 min)

Write the PR description for your branch, for a busy senior engineer who has
five minutes. Compare it with PR #42's description:

- what changed,
- how you verified it (exactly what you ran),
- what you did **not** verify,
- which part of the diff they should review most carefully,
- which parts were AI-written.
