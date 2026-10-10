// "Add to calendar" support: builds an RFC 5545 .ics file for one event or a
// whole series, so members can import it into Google Calendar / Outlook.
import { createHash } from 'node:crypto';

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  organizerName: string;
  organizerEmail: string;
  url?: string;
}

const PRODUCT_ID = '-//EventPass//Meetups 1.0//EN';
const MAX_LINE = 75;

function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Lines longer than 75 octets must be folded: CRLF followed by one space.
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8');
  if (bytes.length <= MAX_LINE) return line;
  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (parts.length === 0 ? MAX_LINE : MAX_LINE - 1), bytes.length);
    // don't split a multi-byte character
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString('utf8'));
    start = end;
  }
  return parts.join('\r\n ');
}

function uidFor(event: CalendarEvent): string {
  const hash = createHash('sha1').update(event._id).digest('hex').slice(0, 20);
  return `${hash}@eventpass.app`;
}

function vevent(event: CalendarEvent, stamp: Date): string[] {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${uidFor(event)}`,
    `DTSTAMP:${formatUtc(stamp)}`,
    `DTSTART:${formatUtc(event.start)}`,
    `DTEND:${formatUtc(event.end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `ORGANIZER;CN=${escapeText(event.organizerName)}:mailto:${event.organizerEmail}`,
  ];
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.url) lines.push(`URL:${event.url}`);
  lines.push('BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(event.title)}`, 'END:VALARM');
  lines.push('END:VEVENT');
  return lines;
}

export function buildCalendar(events: CalendarEvent[], name: string, stamp = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODUCT_ID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    ...events.flatMap((e) => vevent(e, stamp)),
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function calendarFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'event'}.ics`;
}

export function calendarHeaders(title: string): Record<string, string> {
  return {
    'content-type': 'text/calendar; charset=utf-8',
    'content-disposition': `attachment; filename="${calendarFileName(title)}"`,
  };
}
