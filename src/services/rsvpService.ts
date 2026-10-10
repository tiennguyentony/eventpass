import type { Event, Rsvp, User } from '../domain/models';
import { rsvpsOpen, spotsLeft } from '../domain/rsvpRules';
import type { Clock } from '../lib/clock';
import { conflict, notFound } from '../lib/errors';
import type { IdGenerator } from '../lib/ids';
import type { Store } from '../store/store';
import type { WebhookPayload, WebhookService } from '../webhooks/webhookService';
import { requireOrganizerOf } from './permissions';
import { attendeesToCsv } from './attendeeExport';

export class RsvpService {
  constructor(
    private readonly deps: {
      store: Store;
      clock: Clock;
      ids: IdGenerator;
      webhooks: WebhookService;
      rsvpCloseHours: number;
    },
  ) {}

  spotsLeft(event: Event): number {
    return spotsLeft(event, this.deps.store.listRsvpsForEvent(event.id));
  }

  join(user: User, eventId: string, guests: number): Rsvp {
    const { store, clock, ids } = this.deps;
    const event = store.getEvent(eventId);
    if (!event) throw notFound('Event');

    const now = clock.now();
    if (!rsvpsOpen(event, now, this.deps.rsvpCloseHours)) {
      throw conflict('RSVP_CLOSED', 'RSVPs for this event are closed');
    }

    const existing = store.findRsvp(eventId, user.id);
    if (existing?.status === 'going') throw conflict('ALREADY_GOING', 'You are already going');
    if (this.spotsLeft(event) < 1 + guests) throw conflict('EVENT_FULL', 'Not enough spots left');

    const rsvp: Rsvp = {
      id: existing?.id ?? ids.id('rsvp'),
      eventId,
      userId: user.id,
      status: 'going',
      guests,
      createdAt: existing?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
    store.saveRsvp(rsvp);
    this.announce(event, rsvp, 'rsvp.created');
    return rsvp;
  }

  cancel(user: User, eventId: string, rsvpId: string): Rsvp {
    const { store, clock } = this.deps;
    const rsvp = store.getRsvp(rsvpId);
    if (!rsvp || rsvp.eventId !== eventId || rsvp.userId !== user.id) throw notFound('RSVP');
    if (rsvp.status === 'cancelled') return rsvp;

    const cancelled: Rsvp = { ...rsvp, status: 'cancelled', updatedAt: clock.now().toISOString() };
    store.saveRsvp(cancelled);
    this.announce(store.getEvent(eventId)!, cancelled, 'rsvp.cancelled');
    return cancelled;
  }

  exportAttendees(user: User, eventId: string): string {
    const { store } = this.deps;
    const event = store.getEvent(eventId);
    if (!event) throw notFound('Event');
    requireOrganizerOf(store, user, event.groupId);

    const rows = store
      .listRsvpsForEvent(eventId)
      .filter((r) => r.status === 'going')
      .map((r) => ({ rsvp: r, user: store.getUser(r.userId)! }));
    return attendeesToCsv(rows);
  }

  private announce(event: Event, rsvp: Rsvp, type: WebhookPayload['type']) {
    const group = this.deps.store.getGroup(event.groupId);
    if (!group?.webhook) return;

    // Delivered in the background: the member shouldn't wait for the
    // organizer's server to answer.
    this.deps.webhooks.deliver(group.webhook, {
      type,
      eventId: event.id,
      rsvp: { id: rsvp.id, userId: rsvp.userId, status: rsvp.status, guests: rsvp.guests },
      occurredAt: this.deps.clock.now().toISOString(),
    });
  }
}
