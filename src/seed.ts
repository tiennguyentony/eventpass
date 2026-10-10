import type { Rsvp, User } from './domain/models';
import type { Clock } from './lib/clock';
import type { IdGenerator } from './lib/ids';
import { DAY_MS, wallTimeIn } from './lib/time';
import { EventService } from './services/eventService';
import type { Store } from './store/store';

const pad = (n: number) => String(n).padStart(2, '0');

// Local date-time string `days` from now, at the given wall-clock time.
function daysFromNow(now: Date, days: number, timeZone: string, time: string): string {
  const d = wallTimeIn(new Date(now.getTime() + days * DAY_MS), timeZone);
  return `${d.year}-${pad(d.month)}-${pad(d.day)}T${time}`;
}

const daysUntilSaturday = (now: Date) => ((6 - now.getUTCDay() + 7) % 7) || 7;

// The run club series starts on a Thursday shortly before the clocks change
// in spring, so the demo data covers both winter and summer time.
function runClubStart(now: Date): string {
  let year = now.getUTCFullYear();
  if (now.getUTCMonth() >= 2) year++;
  const lastSunday = new Date(Date.UTC(year, 2, 31));
  lastSunday.setUTCDate(31 - lastSunday.getUTCDay());
  const thursday = new Date(lastSunday.getTime() - 10 * DAY_MS);
  return `${thursday.getUTCFullYear()}-${pad(thursday.getUTCMonth() + 1)}-${pad(thursday.getUTCDate())}T19:00`;
}

export function seed(store: Store, clock: Clock, ids: IdGenerator): void {
  const now = clock.now();
  const users: User[] = [
    { id: 'usr_olivia', email: 'olivia@example.com', name: 'Olivia Hart', role: 'organizer' },
    { id: 'usr_omar', email: 'omar@example.com', name: 'Omar Haddad', role: 'organizer' },
    { id: 'usr_alice', email: 'alice@example.com', name: 'Alice Moreau', role: 'member' },
    { id: 'usr_bob', email: 'bob@example.com', name: 'Bob Okafor', role: 'member' },
    { id: 'usr_carol', email: 'carol@example.com', name: 'Carol Nguyen', role: 'member' },
    { id: 'usr_dave', email: 'dave@example.com', name: 'Dave Kowalski', role: 'member' },
  ];
  for (const user of users) store.saveUser(user);
  const [olivia, omar] = users;

  store.saveGroup({ id: 'grp_runclub', name: 'Hackney Run Club', organizerId: olivia.id });
  store.saveGroup({ id: 'grp_tsberlin', name: 'TypeScript Berlin', organizerId: omar.id });

  const events = new EventService({ store, clock, ids });
  const [thursdayRun] = events.create(olivia, 'grp_runclub', {
    title: 'Thursday 5k',
    description: 'Easy 5k loop around Victoria Park. All paces welcome.',
    venue: 'Victoria Park, Crown Gate East',
    startsAt: runClubStart(now),
    timezone: 'Europe/London',
    durationMinutes: 60,
    capacity: 25,
    repeatWeekly: 8,
  });
  const [longRun] = events.create(olivia, 'grp_runclub', {
    title: 'Saturday long run',
    description: '15k along the canal, coffee after.',
    venue: 'Regent’s Canal, Broadway Market',
    startsAt: daysFromNow(now, daysUntilSaturday(now), 'Europe/London', '09:00'),
    timezone: 'Europe/London',
    durationMinutes: 120,
    capacity: 15,
  });
  const [tsNight] = events.create(omar, 'grp_tsberlin', {
    title: 'TypeScript Night: testing without mocks',
    description: 'Two short talks and pizza. Small room, so please cancel if you can’t make it.',
    venue: 'Factory Berlin, Rheinsberger Str. 76',
    startsAt: daysFromNow(now, 3, 'Europe/Berlin', '18:30'),
    timezone: 'Europe/Berlin',
    durationMinutes: 150,
    capacity: 3,
  });
  events.create(omar, 'grp_tsberlin', {
    title: 'Hack evening',
    description: 'Bring a laptop and a side project.',
    venue: 'Factory Berlin, Rheinsberger Str. 76',
    startsAt: daysFromNow(now, 10, 'Europe/Berlin', '19:00'),
    timezone: 'Europe/Berlin',
    durationMinutes: 180,
    capacity: 40,
  });

  const rsvp = (eventId: string, userId: string, status: Rsvp['status'], guests = 0) => {
    const at = new Date(now.getTime() - DAY_MS).toISOString();
    store.saveRsvp({ id: ids.id('rsvp'), eventId, userId, status, guests, createdAt: at, updatedAt: at });
  };
  rsvp(thursdayRun.id, 'usr_alice', 'going');
  rsvp(thursdayRun.id, 'usr_dave', 'going');
  rsvp(longRun.id, 'usr_alice', 'going', 1);
  rsvp(tsNight.id, 'usr_alice', 'going');
  rsvp(tsNight.id, 'usr_bob', 'cancelled');
  rsvp(tsNight.id, 'usr_carol', 'going');
}
