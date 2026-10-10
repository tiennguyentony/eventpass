import { describe, expect, it } from 'vitest';
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, verifySignature } from '../../src/webhooks/signing';
import { createTestApp, EVT_RUN } from '../helpers';

const HOOK_URL = 'https://hooks.example.com/eventpass';

async function withWebhook() {
  const ctx = createTestApp();
  const res = await ctx
    .api()
    .put('/groups/grp_run/webhook')
    .set(ctx.bearer(await ctx.login('olivia')))
    .send({ url: HOOK_URL });
  return { ...ctx, secret: res.body.webhook.secret as string, res };
}

describe('webhooks', () => {
  it('lets the organizer register a URL and returns the signing secret once', async () => {
    const { res, api } = await withWebhook();
    expect(res.status).toBe(200);
    expect(res.body.webhook).toEqual({ url: HOOK_URL, secret: expect.any(String) });

    const group = await api().get('/groups/grp_run');
    expect(group.body.group).toEqual({ id: 'grp_run', name: 'Run Club', organizerId: 'usr_olivia', webhookUrl: HOOK_URL });
  });

  it('rejects members and non-http URLs', async () => {
    const { api, login, bearer } = createTestApp();
    const member = await api().put('/groups/grp_run/webhook').set(bearer(await login('alice'))).send({ url: HOOK_URL });
    expect(member.status).toBe(403);
    const ftp = await api()
      .put('/groups/grp_run/webhook')
      .set(bearer(await login('olivia')))
      .send({ url: 'ftp://hooks.example.com/x' });
    expect(ftp.status).toBe(400);
  });

  it('sends a signed POST when someone RSVPs', async () => {
    const { http, login, rsvp, secret, clock } = await withWebhook();
    await rsvp(await login('alice'), EVT_RUN, 1);

    expect(http.requests).toHaveLength(1);
    const [req] = http.requests;
    expect(req.url).toBe(HOOK_URL);
    expect(JSON.parse(req.body)).toMatchObject({
      type: 'rsvp.created',
      eventId: EVT_RUN,
      rsvp: { userId: 'usr_alice', status: 'going', guests: 1 },
    });
    expect(req.headers[TIMESTAMP_HEADER]).toBe(String(clock.now().getTime() / 1000));
    expect(
      verifySignature({
        secret,
        timestamp: req.headers[TIMESTAMP_HEADER],
        signature: req.headers[SIGNATURE_HEADER],
        body: req.body,
        now: clock.now(),
      }),
    ).toBe(true);
  });

  it('sends rsvp.cancelled when a member cancels', async () => {
    const { http, api, login, bearer, rsvp } = await withWebhook();
    const token = await login('alice');
    const id = (await rsvp(token, EVT_RUN)).body.rsvp.id;
    await api().delete(`/events/${EVT_RUN}/rsvps/${id}`).set(bearer(token));
    expect(http.requests.map((r) => JSON.parse(r.body).type)).toEqual(['rsvp.created', 'rsvp.cancelled']);
  });

  it('does not block the RSVP when the receiver answers with an error', async () => {
    const { http, login, rsvp } = await withWebhook();
    http.status = 500;
    const res = await rsvp(await login('alice'), EVT_RUN);
    expect(res.status).toBe(201);
  });

  it('can be removed', async () => {
    const { api, login, bearer, rsvp, http } = await withWebhook();
    const del = await api().delete('/groups/grp_run/webhook').set(bearer(await login('olivia')));
    expect(del.status).toBe(204);
    await rsvp(await login('alice'), EVT_RUN);
    expect(http.requests).toHaveLength(0);
  });
});
