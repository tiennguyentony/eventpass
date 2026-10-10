import type { Event, User } from '../domain/models';
import type { Clock } from '../lib/clock';
import type { Logger } from '../lib/logger';
import { DAY_MS, formatForHumans } from '../lib/time';
import type { Email, Notifier } from '../notifications/notifier';
import type { Store } from '../store/store';

export interface DigestDeps {
  store: Store;
  clock: Clock;
  notifier: Notifier;
  logger: Logger;
}

// "Your events this week": one email per member with at least one RSVP for
// an event in the next 7 days. Times are shown in each event's own zone.
export function buildDigests(store: Store, now: Date): Email[] {
  const from = now.toISOString();
  const until = new Date(now.getTime() + 7 * DAY_MS).toISOString();
  const upcoming = new Map<string, Event>(
    store
      .listEvents()
      .filter((e) => e.startsAt >= from && e.startsAt < until)
      .map((e) => [e.id, e]),
  );

  const byUser = new Map<string, Event[]>();
  for (const event of upcoming.values()) {
    for (const rsvp of store.listRsvpsForEvent(event.id)) {
      if (rsvp.status !== 'going') continue;
      byUser.set(rsvp.userId, [...(byUser.get(rsvp.userId) ?? []), event]);
    }
  }

  const emails: Email[] = [];
  for (const [userId, events] of byUser) {
    const user = store.getUser(userId);
    if (user) emails.push(digestEmail(user, events));
  }
  return emails;
}

function digestEmail(user: User, events: Event[]): Email {
  const lines = events
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((e) => `- ${formatForHumans(new Date(e.startsAt), e.timezone)}  ${e.title} @ ${e.venue}`);
  return {
    to: user.email,
    subject: `Your events this week (${events.length})`,
    text: [`Hi ${user.name},`, '', 'You are going to:', ...lines, '', 'See you there!'].join('\n'),
  };
}

export async function runDigest(deps: DigestDeps): Promise<number> {
  const emails = buildDigests(deps.store, deps.clock.now());
  for (const email of emails) {
    try {
      await deps.notifier.send(email);
    } catch (err) {
      deps.logger.error('digest email failed', { to: email.to, error: String(err) });
    }
  }
  deps.logger.info('digest sent', { emails: emails.length });
  return emails.length;
}
