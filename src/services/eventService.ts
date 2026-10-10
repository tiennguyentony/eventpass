import type { Event, User } from '../domain/models';
import { MAX_OCCURRENCES, weeklyStarts } from '../domain/recurrence';
import type { Clock } from '../lib/clock';
import { badRequest, notFound } from '../lib/errors';
import type { IdGenerator } from '../lib/ids';
import { parseLocalDateTime, zonedToUtc } from '../lib/time';
import type { Store } from '../store/store';
import { compareKeys, decodeCursor, encodeCursor } from './cursor';
import { requireOrganizerOf } from './permissions';

export interface NewEvent {
  title: string;
  description: string;
  venue: string;
  startsAt: string; // local wall time in `timezone`, "YYYY-MM-DDTHH:mm"
  timezone: string;
  durationMinutes: number;
  capacity: number;
  repeatWeekly?: number; // number of occurrences, including the first
}

export type EventChanges = Partial<Pick<NewEvent, 'title' | 'description' | 'venue' | 'startsAt' | 'durationMinutes' | 'capacity'>>;

export interface SearchQuery {
  q?: string;
  groupId?: string;
  from?: Date;
  limit: number;
  cursor?: string;
}

export class EventService {
  constructor(private readonly deps: { store: Store; clock: Clock; ids: IdGenerator }) {}

  get(id: string): Event {
    const event = this.deps.store.getEvent(id);
    if (!event) throw notFound('Event');
    return event;
  }

  create(user: User, groupId: string, input: NewEvent): Event[] {
    const { store, clock, ids } = this.deps;
    requireOrganizerOf(store, user, groupId);

    const first = zonedToUtc(this.parseLocal(input.startsAt), input.timezone);
    if (first <= clock.now()) throw badRequest('START_IN_PAST', 'Events must start in the future');

    const count = Math.min(input.repeatWeekly ?? 1, MAX_OCCURRENCES);
    const seriesId = count > 1 ? ids.id('series') : undefined;
    const now = clock.now().toISOString();

    const events = weeklyStarts(first, count).map((start) => ({
      id: ids.id('evt'),
      groupId,
      title: input.title,
      description: input.description,
      venue: input.venue,
      startsAt: start.toISOString(),
      timezone: input.timezone,
      durationMinutes: input.durationMinutes,
      capacity: input.capacity,
      seriesId,
      createdAt: now,
      updatedAt: now,
    }));
    for (const event of events) store.saveEvent(event);
    return events;
  }

  // Changes one occurrence only; the rest of the series is left alone.
  update(user: User, id: string, changes: EventChanges): Event {
    const event = this.get(id);
    requireOrganizerOf(this.deps.store, user, event.groupId);

    const { startsAt, ...rest } = changes;
    const updated: Event = { ...event, ...rest, updatedAt: this.deps.clock.now().toISOString() };
    if (startsAt) {
      updated.startsAt = zonedToUtc(this.parseLocal(startsAt), event.timezone).toISOString();
    }
    this.deps.store.saveEvent(updated);
    return updated;
  }

  search(query: SearchQuery): { items: Event[]; nextCursor: string | null } {
    const from = (query.from ?? this.deps.clock.now()).toISOString();
    const text = query.q?.trim().toLowerCase();
    const after = query.cursor ? decodeCursor(query.cursor) : undefined;

    const matches = this.deps.store
      .listEvents()
      .filter((e) => e.startsAt >= from)
      .filter((e) => !query.groupId || e.groupId === query.groupId)
      .filter((e) => !text || `${e.title} ${e.description}`.toLowerCase().includes(text))
      .filter((e) => !after || compareKeys(e, after) > 0)
      .sort(compareKeys);

    const items = matches.slice(0, query.limit);
    const hasMore = matches.length > query.limit;
    const last = items.at(-1);
    return { items, nextCursor: hasMore && last ? encodeCursor(last) : null };
  }

  private parseLocal(value: string) {
    const local = parseLocalDateTime(value);
    if (!local) throw badRequest('INVALID_START', 'Use local time like 2027-03-18T19:00');
    return local;
  }
}
