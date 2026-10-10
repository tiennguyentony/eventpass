import { describe, expect, it } from 'vitest';
import { buildDigests, runDigest } from '../../src/jobs/digest';
import { silentLogger } from '../../src/lib/logger';
import { createTestApp, EVT_RUN, EVT_TALK } from '../helpers';

describe('weekly digest', () => {
  it("lists each member's events for the next 7 days in the event's own time zone", async () => {
    const { store, clock, login, rsvp } = createTestApp();
    const alice = await login('alice');
    await rsvp(alice, EVT_RUN);
    await rsvp(alice, EVT_TALK);

    const emails = buildDigests(store, clock.now());
    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('alice@example.com');
    expect(emails[0].subject).toBe('Your events this week (2)');
    expect(emails[0].text).toContain('- Wed, 13 Jan 2027, 18:30 CET  TypeScript talk night');
    expect(emails[0].text).toContain('- Thu, 14 Jan 2027, 19:00 GMT  Thursday 5k');
  });

  it('skips cancelled RSVPs and events more than a week away', async () => {
    const { api, store, clock, login, bearer, rsvp } = createTestApp();
    const bob = await login('bob');
    const id = (await rsvp(bob, EVT_RUN)).body.rsvp.id;
    await api().delete(`/events/${EVT_RUN}/rsvps/${id}`).set(bearer(bob));
    await rsvp(await login('carol'), EVT_TALK);

    clock.set('2027-01-04T09:00:00.000Z'); // talk is 9 days later
    expect(buildDigests(store, clock.now())).toEqual([]);
  });

  it('sends the emails through the notifier', async () => {
    const { store, clock, notifier, login, rsvp } = createTestApp();
    await rsvp(await login('alice'), EVT_RUN);
    await rsvp(await login('bob'), EVT_TALK);

    const sent = await runDigest({ store, clock, notifier, logger: silentLogger });
    expect(sent).toBe(2);
    expect(notifier.sent.map((e) => e.to).sort()).toEqual(['alice@example.com', 'bob@example.com']);
  });
});
