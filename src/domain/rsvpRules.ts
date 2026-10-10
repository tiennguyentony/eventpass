import type { Event, Rsvp } from './models';
import { HOUR_MS } from '../lib/time';

// Seats used by a set of RSVPs: each member plus their guests.
export function seatsTaken(rsvps: Rsvp[]): number {
  return rsvps.reduce((sum, r) => sum + 1 + r.guests, 0);
}

export function spotsLeft(event: Event, rsvps: Rsvp[]): number {
  return Math.max(0, event.capacity - seatsTaken(rsvps));
}

// RSVPs close 1 hour before the event starts, so organizers have a final
// headcount. Cancelling is always allowed.
export function rsvpsOpen(event: Event, now: Date, closeHours: number): boolean {
  const closesAt = new Date(event.startsAt).getTime() - closeHours * HOUR_MS;
  return now.getTime() < closesAt;
}
