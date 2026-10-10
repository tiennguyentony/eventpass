const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const MAX_OCCURRENCES = 26;

// Start instants for a weekly series. Each occurrence starts exactly one week
// after the previous one.
export function weeklyStarts(first: Date, count: number): Date[] {
  const starts: Date[] = [];
  for (let i = 0; i < count; i++) {
    starts.push(new Date(first.getTime() + i * WEEK_MS));
  }
  return starts;
}
