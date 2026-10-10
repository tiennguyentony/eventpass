import type { Event, Group, Rsvp, Session, User } from '../domain/models';

// Everything the app reads or writes goes through this interface.
// MemoryStore is used in tests; JsonFileStore adds snapshots to disk.
export interface Store {
  getUser(id: string): User | undefined;
  findUserByEmail(email: string): User | undefined;
  saveUser(user: User): void;

  getSession(token: string): Session | undefined;
  saveSession(session: Session): void;

  getGroup(id: string): Group | undefined;
  listGroups(): Group[];
  saveGroup(group: Group): void;

  getEvent(id: string): Event | undefined;
  listEvents(): Event[];
  saveEvent(event: Event): void;

  getRsvp(id: string): Rsvp | undefined;
  findRsvp(eventId: string, userId: string): Rsvp | undefined;
  listRsvpsForEvent(eventId: string): Rsvp[];
  listRsvpsForUser(userId: string): Rsvp[];
  saveRsvp(rsvp: Rsvp): void;
}

export interface Snapshot {
  users: User[];
  sessions: Session[];
  groups: Group[];
  events: Event[];
  rsvps: Rsvp[];
}
