import { describe, expect, it } from 'vitest';
import { createTestApp, EVT_RUN, EVT_TALK } from '../helpers';

const newEvent = {
  title: 'Track session',
  venue: 'Mile End Stadium',
  startsAt: '2027-01-20T18:30',
  timezone: 'Europe/London',
  durationMinutes: 90,
  capacity: 20,
};

describe('creating events', () => {
  it('lets the group organizer create an event from local time and zone', async () => {
    const { api, login, bearer } = createTestApp();
    const res = await api().post('/groups/grp_run/events').set(bearer(await login('olivia'))).send(newEvent);
    expect(res.status).toBe(201);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0]).toMatchObject({
      startsAt: '2027-01-20T18:30:00.000Z',
      timezone: 'Europe/London',
      localStart: '2027-01-20T18:30',
      display: 'Wed, 20 Jan 2027, 18:30 GMT',
      spotsLeft: 20,
      seriesId: null,
    });
  });

  it('creates a weekly series', async () => {
    const { api, login, bearer } = createTestApp();
    const res = await api()
      .post('/groups/grp_run/events')
      .set(bearer(await login('olivia')))
      .send({ ...newEvent, repeatWeekly: 4 });
    expect(res.status).toBe(201);
    const events = res.body.events;
    expect(events.map((e: { localStart: string }) => e.localStart)).toEqual([
      '2027-01-20T18:30',
      '2027-01-27T18:30',
      '2027-02-03T18:30',
      '2027-02-10T18:30',
    ]);
    expect(new Set(events.map((e: { seriesId: string }) => e.seriesId)).size).toBe(1);
  });

  it('only allows the organizer of that group', async () => {
    const { api, login, bearer } = createTestApp();
    const asMember = await api().post('/groups/grp_run/events').set(bearer(await login('alice'))).send(newEvent);
    expect(asMember.status).toBe(403);
    const otherOrganizer = await api().post('/groups/grp_run/events').set(bearer(await login('omar'))).send(newEvent);
    expect(otherOrganizer.status).toBe(403);
  });

  it('validates the body', async () => {
    const { api, login, bearer } = createTestApp();
    const token = await login('olivia');
    const badZone = await api()
      .post('/groups/grp_run/events')
      .set(bearer(token))
      .send({ ...newEvent, timezone: 'London' });
    expect(badZone.status).toBe(400);
    expect(badZone.body.error.code).toBe('VALIDATION_FAILED');

    const past = await api()
      .post('/groups/grp_run/events')
      .set(bearer(token))
      .send({ ...newEvent, startsAt: '2027-01-01T10:00' });
    expect(past.status).toBe(400);
    expect(past.body.error.code).toBe('START_IN_PAST');
  });
});

describe('updating events', () => {
  it('changes one occurrence', async () => {
    const { api, login, bearer } = createTestApp();
    const res = await api()
      .patch(`/events/${EVT_RUN}`)
      .set(bearer(await login('olivia')))
      .send({ title: 'Thursday 5k (new route)', startsAt: '2027-01-14T19:30' });
    expect(res.status).toBe(200);
    expect(res.body.event).toMatchObject({ title: 'Thursday 5k (new route)', startsAt: '2027-01-14T19:30:00.000Z' });

    const fetched = await api().get(`/events/${EVT_RUN}`);
    expect(fetched.body.event.title).toBe('Thursday 5k (new route)');
  });

  it("rejects changes to another group's event", async () => {
    const { api, login, bearer } = createTestApp();
    const res = await api().patch(`/events/${EVT_TALK}`).set(bearer(await login('olivia'))).send({ title: 'Mine now' });
    expect(res.status).toBe(403);
  });
});

describe('public search', () => {
  it('lists upcoming events in start order', async () => {
    const { api } = createTestApp();
    const res = await api().get('/events');
    expect(res.status).toBe(200);
    expect(res.body.items.map((e: { id: string }) => e.id)).toEqual([EVT_TALK, EVT_RUN]);
    expect(res.body.nextCursor).toBeNull();
  });

  it('filters by text and group', async () => {
    const { api } = createTestApp();
    const byText = await api().get('/events?q=typescript');
    expect(byText.body.items.map((e: { id: string }) => e.id)).toEqual([EVT_TALK]);
    const byGroup = await api().get('/events?groupId=grp_run');
    expect(byGroup.body.items.map((e: { id: string }) => e.id)).toEqual([EVT_RUN]);
  });

  it('pages with a cursor without skipping or repeating events when new ones are added', async () => {
    const { api, login, bearer } = createTestApp();
    await api()
      .post('/groups/grp_run/events')
      .set(bearer(await login('olivia')))
      .send({ ...newEvent, repeatWeekly: 5 });

    const page1 = await api().get('/events?groupId=grp_run&limit=3');
    expect(page1.body.items).toHaveLength(3);
    expect(page1.body.nextCursor).toEqual(expect.any(String));

    // An event inserted before the cursor position must not shift page 2.
    await api()
      .post('/groups/grp_run/events')
      .set(bearer(await login('olivia')))
      .send({ ...newEvent, title: 'Early bird', startsAt: '2027-01-12T07:00' });

    const page2 = await api().get(`/events?groupId=grp_run&limit=3&cursor=${page1.body.nextCursor}`);
    const ids = [...page1.body.items, ...page2.body.items].map((e: { id: string }) => e.id);
    expect(new Set(ids).size).toBe(6);
    expect(page2.body.nextCursor).toBeNull();
  });

  it('caches identical queries briefly', async () => {
    const { api } = createTestApp();
    const first = await api().get('/events?q=5k');
    const second = await api().get('/events?q=5k');
    expect(first.headers['x-cache']).toBe('miss');
    expect(second.headers['x-cache']).toBe('hit');
    expect(second.body).toEqual(first.body);
  });

  it('rejects an invalid cursor', async () => {
    const { api } = createTestApp();
    const res = await api().get('/events?cursor=nope');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURSOR');
  });
});
