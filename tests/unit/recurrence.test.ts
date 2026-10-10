import { describe, expect, it } from 'vitest';
import { weeklyStarts } from '../../src/domain/recurrence';
import { toLocalDateTime } from '../../src/lib/time';

describe('weeklyStarts', () => {
  it('returns one start per week, beginning with the first', () => {
    const starts = weeklyStarts(new Date('2027-01-07T19:00:00.000Z'), 3);
    expect(starts.map((d) => d.toISOString())).toEqual([
      '2027-01-07T19:00:00.000Z',
      '2027-01-14T19:00:00.000Z',
      '2027-01-21T19:00:00.000Z',
    ]);
  });

  it('keeps the same local start time for every occurrence', () => {
    const starts = weeklyStarts(new Date('2027-01-07T19:00:00.000Z'), 4);
    expect(starts.map((d) => toLocalDateTime(d, 'Europe/London').slice(11))).toEqual([
      '19:00',
      '19:00',
      '19:00',
      '19:00',
    ]);
  });
});
