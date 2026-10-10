export type Role = 'member' | 'organizer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Webhook {
  url: string;
  secret: string;
}

export interface Group {
  id: string;
  name: string;
  organizerId: string;
  webhook?: Webhook;
}

export interface Event {
  id: string;
  groupId: string;
  title: string;
  description: string;
  venue: string;
  startsAt: string; // UTC ISO instant
  timezone: string; // IANA zone the event happens in, e.g. "Europe/London"
  durationMinutes: number;
  capacity: number;
  seriesId?: string;
  createdAt: string;
  updatedAt: string;
}

export type RsvpStatus = 'going' | 'cancelled';

export interface Rsvp {
  id: string;
  eventId: string;
  userId: string;
  status: RsvpStatus;
  guests: number; // plus-ones, not counting the member
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
}
