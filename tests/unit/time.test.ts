import { describe, expect, it } from 'vitest';
import {
  formatForHumans,
  isValidTimeZone,
  parseLocalDateTime,
  toLocalDateTime,
  zonedToUtc,
} from '../../src/lib/time';

const local = (value: string) => parseLocalDateTime(value)!;

describe('time zones', () => {
  it('converts London wall time to UTC in winter and summer', () => {
    expect(zonedToUtc(local('2027-01-14T19:00'), 'Europe/London').toISOString()).toBe('2027-01-14T19:00:00.000Z');
    expect(zonedToUtc(local('2027-07-15T19:00'), 'Europe/London').toISOString()).toBe('2027-07-15T18:00:00.000Z');
  });

  it('converts zones west of UTC', () => {
    expect(zonedToUtc(local('2027-01-14T19:00'), 'America/New_York').toISOString()).toBe('2027-01-15T00:00:00.000Z');
  });

  it('moves a time inside the spring-forward gap to after the gap', () => {
    // 01:30 does not exist in London on 28 March 2027.
    const utc = zonedToUtc(local('2027-03-28T01:30'), 'Europe/London');
    expect(toLocalDateTime(utc, 'Europe/London')).toBe('2027-03-28T02:30');
  });

  it('shows an instant as local time in the event zone', () => {
    const instant = new Date('2027-01-13T17:30:00.000Z');
    expect(toLocalDateTime(instant, 'Europe/Berlin')).toBe('2027-01-13T18:30');
    expect(formatForHumans(instant, 'Europe/Berlin')).toBe('Wed, 13 Jan 2027, 18:30 CET');
  });

  it('rejects malformed local times and unknown zones', () => {
    expect(parseLocalDateTime('2027-01-14 19:00')).toBeNull();
    expect(parseLocalDateTime('2027-13-01T10:00')).toBeNull();
    expect(isValidTimeZone('Europe/London')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
  });
});
