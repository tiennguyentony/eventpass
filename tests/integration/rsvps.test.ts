import { describe, expect, it } from 'vitest';
import { createTestApp, EVT_RUN, EVT_TALK } from '../helpers';

describe('RSVPs', () => {
  it('requires login', async () => {
    const { api } = createTestApp();
    const res = await api().post(`/events/${EVT_RUN}/rsvps`).send({});
    expect(res.status).toBe(401);
  });

  it('lets a member RSVP with guests', async () => {
    const { api, login, rsvp } = createTestApp();
    const res = await rsvp(await login('alice'), EVT_RUN, 1);
    expect(res.status).toBe(201);
    expect(res.body.rsvp).toMatchObject({ eventId: EVT_RUN, status: 'going', guests: 1 });

    const event = await api().get(`/events/${EVT_RUN}`);
    expect(event.body.event.spotsLeft).toBe(1);
  });

  it('refuses a second RSVP from the same member', async () => {
    const { login, rsvp } = createTestApp();
    const token = await login('alice');
    await rsvp(token, EVT_RUN);
    const res = await rsvp(token, EVT_RUN);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_GOING');
  });

  it('refuses RSVPs once the event is full, counting guests', async () => {
    const { login, rsvp } = createTestApp();
    await rsvp(await login('alice'), EVT_RUN, 2); // capacity 3
    const res = await rsvp(await login('bob'), EVT_RUN);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_FULL');
  });

  it('limits guests', async () => {
    const { login, rsvp } = createTestApp();
    const res = await rsvp(await login('alice'), EVT_TALK, 9);
    expect(res.status).toBe(400);
  });

  it('closes RSVPs 2 hours before the start', async () => {
    const { login, rsvp, clock } = createTestApp();
    const alice = await login('alice');
    const bob = await login('bob');

    clock.set('2027-01-14T16:59:00.000Z'); // 2h01m before 19:00
    expect((await rsvp(alice, EVT_RUN)).status).toBe(201);

    clock.set('2027-01-14T17:01:00.000Z'); // 1h59m before
    const late = await rsvp(bob, EVT_RUN);
    expect(late.status).toBe(409);
    expect(late.body.error.code).toBe('RSVP_CLOSED');
  });

  it('lets a member cancel their own RSVP', async () => {
    const { api, login, bearer, rsvp } = createTestApp();
    const token = await login('alice');
    const id = (await rsvp(token, EVT_RUN)).body.rsvp.id;
    const res = await api().delete(`/events/${EVT_RUN}/rsvps/${id}`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.rsvp.status).toBe('cancelled');
  });

  it("does not let a member cancel someone else's RSVP", async () => {
    const { api, login, bearer, rsvp } = createTestApp();
    const id = (await rsvp(await login('alice'), EVT_RUN)).body.rsvp.id;
    const res = await api().delete(`/events/${EVT_RUN}/rsvps/${id}`).set(bearer(await login('bob')));
    expect(res.status).toBe(404);
  });

  it('reuses the same RSVP when a member comes back after cancelling', async () => {
    const { api, login, bearer, rsvp } = createTestApp();
    const token = await login('alice');
    const id = (await rsvp(token, EVT_RUN)).body.rsvp.id;
    await api().delete(`/events/${EVT_RUN}/rsvps/${id}`).set(bearer(token));
    const again = await rsvp(token, EVT_RUN);
    expect(again.status).toBe(201);
    expect(again.body.rsvp.id).toBe(id);
  });

  it("lists the member's upcoming RSVPs", async () => {
    const { api, login, bearer, rsvp } = createTestApp();
    const token = await login('alice');
    await rsvp(token, EVT_RUN);
    await rsvp(token, EVT_TALK);
    const res = await api().get('/me/rsvps').set(bearer(token));
    expect(res.body.items.map((i: { eventId: string }) => i.eventId)).toEqual([EVT_TALK, EVT_RUN]);
  });

  it('rate limits RSVP requests per client', async () => {
    const { login, rsvp } = createTestApp({ rsvpRateLimit: { max: 3, windowMs: 60_000 } });
    const token = await login('alice');
    const statuses = [];
    for (let i = 0; i < 4; i++) statuses.push((await rsvp(token, 'evt_missing')).status);
    expect(statuses).toEqual([404, 404, 404, 429]);
  });
});
