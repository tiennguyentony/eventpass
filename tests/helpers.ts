import request from 'supertest';
import { createApp } from '../src/app';
import { defaultConfig, type Config } from '../src/config';
import type { Event } from '../src/domain/models';
import { FakeClock } from '../src/lib/clock';
import type { HttpClient } from '../src/lib/httpClient';
import { sequentialIds } from '../src/lib/ids';
import { silentLogger } from '../src/lib/logger';
import type { Email, Notifier } from '../src/notifications/notifier';
import { MemoryStore } from '../src/store/memoryStore';

// Monday 11 January 2027, 09:00 UTC. Fixture events are later that week.
export const T0 = new Date('2027-01-11T09:00:00.000Z');

export const EVT_RUN = 'evt_run'; // Thursday 14 Jan 19:00 London, capacity 3
export const EVT_TALK = 'evt_talk'; // Wednesday 13 Jan 18:30 Berlin, capacity 50

export class RecordingHttpClient implements HttpClient {
  readonly requests: { url: string; body: string; headers: Record<string, string> }[] = [];
  status = 200;

  async post(url: string, body: string, headers: Record<string, string>) {
    this.requests.push({ url, body, headers });
    return { status: this.status };
  }
}

export class RecordingNotifier implements Notifier {
  readonly sent: Email[] = [];

  async send(email: Email) {
    this.sent.push(email);
  }
}

function fixtureEvent(overrides: Partial<Event> & Pick<Event, 'id' | 'groupId' | 'title' | 'startsAt' | 'timezone'>): Event {
  return {
    description: '',
    venue: 'Somewhere',
    durationMinutes: 60,
    capacity: 50,
    createdAt: T0.toISOString(),
    updatedAt: T0.toISOString(),
    ...overrides,
  };
}

export function createTestApp(overrides: Partial<Config> = {}) {
  const store = new MemoryStore();
  const clock = new FakeClock(T0);
  const http = new RecordingHttpClient();
  const notifier = new RecordingNotifier();
  const config = { ...defaultConfig, ...overrides };
  const { app, services } = createApp({
    store,
    clock,
    ids: sequentialIds(),
    http,
    notifier,
    logger: silentLogger,
    config,
  });

  for (const name of ['alice', 'bob', 'carol', 'dave', 'erin']) {
    const display = name[0].toUpperCase() + name.slice(1);
    store.saveUser({ id: `usr_${name}`, email: `${name}@example.com`, name: display, role: 'member' });
  }
  store.saveUser({ id: 'usr_olivia', email: 'olivia@example.com', name: 'Olivia', role: 'organizer' });
  store.saveUser({ id: 'usr_omar', email: 'omar@example.com', name: 'Omar', role: 'organizer' });
  store.saveGroup({ id: 'grp_run', name: 'Run Club', organizerId: 'usr_olivia' });
  store.saveGroup({ id: 'grp_ts', name: 'TypeScript Berlin', organizerId: 'usr_omar' });
  store.saveEvent(
    fixtureEvent({
      id: EVT_RUN,
      groupId: 'grp_run',
      title: 'Thursday 5k',
      startsAt: '2027-01-14T19:00:00.000Z',
      timezone: 'Europe/London',
      capacity: 3,
    }),
  );
  store.saveEvent(
    fixtureEvent({
      id: EVT_TALK,
      groupId: 'grp_ts',
      title: 'TypeScript talk night',
      startsAt: '2027-01-13T17:30:00.000Z',
      timezone: 'Europe/Berlin',
    }),
  );

  const api = () => request(app);

  async function login(name: string): Promise<string> {
    const res = await api().post('/auth/login').send({ email: `${name}@example.com` });
    return res.body.token;
  }

  const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

  async function rsvp(token: string, eventId: string, guests?: number) {
    return api()
      .post(`/events/${eventId}/rsvps`)
      .set(bearer(token))
      .send(guests === undefined ? {} : { guests });
  }

  return { app, services, store, clock, http, notifier, config, api, login, bearer, rsvp };
}
