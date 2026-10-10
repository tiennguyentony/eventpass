import type { Rsvp, User } from '../domain/models';

const HEADER = ['name', 'email', 'guests', 'rsvp_at'];

// Organizers open this in Excel or Google Sheets to print a door list.
export function attendeesToCsv(rows: { rsvp: Rsvp; user: User }[]): string {
  const lines = rows
    .sort((a, b) => a.user.name.localeCompare(b.user.name))
    .map(({ rsvp, user }) => [user.name, user.email, rsvp.guests, rsvp.createdAt].join(','));
  return [HEADER.join(','), ...lines].join('\r\n') + '\r\n';
}
