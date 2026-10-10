import type { Event, Group, Rsvp, Session, User } from '../domain/models';
import type { Snapshot, Store } from './store';

// Objects are cloned on the way in and out, so callers can't change stored
// data by accident; they have to call save*().
const copy = <T>(value: T): T => structuredClone(value);

export class MemoryStore implements Store {
  protected users = new Map<string, User>();
  protected sessions = new Map<string, Session>();
  protected groups = new Map<string, Group>();
  protected events = new Map<string, Event>();
  protected rsvps = new Map<string, Rsvp>();

  constructor(snapshot?: Snapshot) {
    if (snapshot) this.load(snapshot);
  }

  getUser(id: string) {
    const user = this.users.get(id);
    return user && copy(user);
  }

  findUserByEmail(email: string) {
    const wanted = email.trim().toLowerCase();
    const user = [...this.users.values()].find((u) => u.email.toLowerCase() === wanted);
    return user && copy(user);
  }

  saveUser(user: User) {
    this.users.set(user.id, copy(user));
    this.changed();
  }

  getSession(token: string) {
    const session = this.sessions.get(token);
    return session && copy(session);
  }

  saveSession(session: Session) {
    this.sessions.set(session.token, copy(session));
    this.changed();
  }

  getGroup(id: string) {
    const group = this.groups.get(id);
    return group && copy(group);
  }

  listGroups() {
    return [...this.groups.values()].map(copy);
  }

  saveGroup(group: Group) {
    this.groups.set(group.id, copy(group));
    this.changed();
  }

  getEvent(id: string) {
    const event = this.events.get(id);
    return event && copy(event);
  }

  listEvents() {
    return [...this.events.values()].map(copy);
  }

  saveEvent(event: Event) {
    this.events.set(event.id, copy(event));
    this.changed();
  }

  getRsvp(id: string) {
    const rsvp = this.rsvps.get(id);
    return rsvp && copy(rsvp);
  }

  findRsvp(eventId: string, userId: string) {
    const rsvp = [...this.rsvps.values()].find((r) => r.eventId === eventId && r.userId === userId);
    return rsvp && copy(rsvp);
  }

  listRsvpsForEvent(eventId: string) {
    return [...this.rsvps.values()].filter((r) => r.eventId === eventId).map(copy);
  }

  listRsvpsForUser(userId: string) {
    return [...this.rsvps.values()].filter((r) => r.userId === userId).map(copy);
  }

  saveRsvp(rsvp: Rsvp) {
    this.rsvps.set(rsvp.id, copy(rsvp));
    this.changed();
  }

  snapshot(): Snapshot {
    return {
      users: [...this.users.values()],
      sessions: [...this.sessions.values()],
      groups: [...this.groups.values()],
      events: [...this.events.values()],
      rsvps: [...this.rsvps.values()],
    };
  }

  isEmpty(): boolean {
    return this.users.size === 0;
  }

  protected load(snapshot: Snapshot) {
    for (const u of snapshot.users) this.users.set(u.id, copy(u));
    for (const s of snapshot.sessions) this.sessions.set(s.token, copy(s));
    for (const g of snapshot.groups) this.groups.set(g.id, copy(g));
    for (const e of snapshot.events) this.events.set(e.id, copy(e));
    for (const r of snapshot.rsvps) this.rsvps.set(r.id, copy(r));
  }

  // Hook for subclasses that persist data.
  protected changed(): void {}
}
