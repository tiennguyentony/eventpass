import type { Event, Group, Rsvp } from '../domain/models';
import { formatForHumans, toLocalDateTime } from '../lib/time';

export function eventDto(event: Event, spotsLeft: number) {
  const start = new Date(event.startsAt);
  return {
    id: event.id,
    groupId: event.groupId,
    title: event.title,
    description: event.description,
    venue: event.venue,
    startsAt: event.startsAt,
    timezone: event.timezone,
    localStart: toLocalDateTime(start, event.timezone),
    display: formatForHumans(start, event.timezone),
    durationMinutes: event.durationMinutes,
    capacity: event.capacity,
    spotsLeft,
    seriesId: event.seriesId ?? null,
  };
}

export function rsvpDto(rsvp: Rsvp) {
  return {
    id: rsvp.id,
    eventId: rsvp.eventId,
    status: rsvp.status,
    guests: rsvp.guests,
    createdAt: rsvp.createdAt,
    updatedAt: rsvp.updatedAt,
  };
}

// Never expose the webhook secret after it has been created.
export function groupDto(group: Group) {
  return {
    id: group.id,
    name: group.name,
    organizerId: group.organizerId,
    webhookUrl: group.webhook?.url ?? null,
  };
}
