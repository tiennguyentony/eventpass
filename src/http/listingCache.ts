import type { Clock } from '../lib/clock';

// Public search is by far our busiest endpoint and mostly anonymous, so
// responses are cached for a short time.
export class ListingCache<T> {
  private readonly entries = new Map<string, { expiresAt: number; value: T }>();

  constructor(
    private readonly ttlMs: number,
    private readonly clock: Clock,
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= this.clock.now().getTime()) return undefined;
    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.set(key, { expiresAt: this.clock.now().getTime() + this.ttlMs, value });
  }
}
