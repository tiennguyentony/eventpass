import { describe, expect, it } from 'vitest';
import { createTestApp, EVT_RUN } from '../helpers';

describe('attendee export', () => {
  it('returns going attendees as CSV, sorted by name', async () => {
    const { api, login, bearer, rsvp, clock } = createTestApp();
    await rsvp(await login('carol'), EVT_RUN);
    clock.advance(60_000);
    await rsvp(await login('alice'), EVT_RUN, 1);

    const res = await api().get(`/events/${EVT_RUN}/attendees.csv`).set(bearer(await login('olivia')));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toBe(
      [
        'name,email,guests,rsvp_at',
        'Alice,alice@example.com,1,2027-01-11T09:01:00.000Z',
        'Carol,carol@example.com,0,2027-01-11T09:00:00.000Z',
        '',
      ].join('\r\n'),
    );
  });

  it('leaves out cancelled RSVPs', async () => {
    const { api, login, bearer, rsvp } = createTestApp();
    const bob = await login('bob');
    const id = (await rsvp(bob, EVT_RUN)).body.rsvp.id;
    await api().delete(`/events/${EVT_RUN}/rsvps/${id}`).set(bearer(bob));

    const res = await api().get(`/events/${EVT_RUN}/attendees.csv`).set(bearer(await login('olivia')));
    expect(res.text).not.toContain('bob@example.com');
  });

  it('is only available to the organizer', async () => {
    const { api, login, bearer } = createTestApp();
    const res = await api().get(`/events/${EVT_RUN}/attendees.csv`).set(bearer(await login('alice')));
    expect(res.status).toBe(403);
  });
});
