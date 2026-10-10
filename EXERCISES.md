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
npm test          # should be green
npm run dev       # API on http://localhost:3000, demo data loaded
```

You need Node 22.13 or newer (`node -v`). Nothing else needs to be installed.

**Ground rules**

1. Share your screen, including your AI chat window.
2. Keep your AI conversation. At the end, export or copy it into
   `session/ai-transcript.md` (or share a link).
3. For each piece of AI output you use, be ready to say whether you
   **accepted**, **edited** or **rejected** it, and why.
4. You may run anything, add files and change code. Commit to a branch
   named `session/<your-name>`.

---

## Exercise 1: Explore and explain (15 min)

Use AI however you like to understand the codebase. Then write
`session/NOTES.md` answering:

1. In two or three sentences: what does this service do, and who uses it?
2. A member sends `POST /events/:id/rsvps`. What happens, step by step,
   until they get a response? Name the files and functions, and every reason
   the request could be refused.
3. What happens **after** the response has been sent? Think about the
   organizer's webhook and the weekly digest. When does each one run, and
   what happens if it fails?

Then **close the AI window** and walk your interviewer through your notes.

## Exercise 2: Review an AI-written pull request (20 min)

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

## Exercise 3: Incident (15 min)

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

## Exercise 4: Pick from the backlog (25 min)

Choose **one**:

- **A. Cancel an event.** Organizers can mark an event as cancelled. Everyone
  going gets an email, the event disappears from search **immediately**, and
  the group's webhook receives an `event.cancelled` delivery.
- **B. Waitlist.** When an event is full, members can join a waitlist. When
  someone cancels, the first person waiting gets the spot and an email.
- **C. Organizer stats.** `GET /groups/:id/stats` returns, per upcoming
  event: going, guests, cancelled, spots left.

**Before you send your first prompt**, write in `session/context.md` what you
will tell the AI about this codebase: conventions, rules, anything it
shouldn't trust, and your "definition of done". Then use it.

Add tests. You will probably not finish. Prioritise, and say what you left
out.

## Exercise 5: Security pass (10 min)

Ask AI to review the attendee export (`src/services/attendeeExport.ts`) and
the webhook code (`src/http/routes/groups.ts`, `src/webhooks/`).

1. Triage what it says: for each finding, **real / not real / not worth
   fixing now**, with one sentence of reasoning.
2. Prove the most serious real one with a test or a `curl` command.

## Exercise 6: Teach the next AI (10 min)

Write an `AGENTS.md` (or `CLAUDE.md`) at the repo root, so the next
engineer's AI tool doesn't repeat the mistakes you saw today. Keep it under
40 lines. Only include things that are true and useful.

## Exercise 7: Pull request description (5 min)

Write the PR description for your branch, for a busy senior engineer who has
five minutes. Compare it with PR #42's description:

- what changed,
- how you verified it (exactly what you ran),
- what you did **not** verify,
- which part of the diff they should review most carefully,
- which parts were AI-written.
