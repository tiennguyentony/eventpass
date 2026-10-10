import { randomBytes, randomUUID } from 'node:crypto';

export interface IdGenerator {
  id(prefix: string): string;
  secret(): string;
}

export const randomIds: IdGenerator = {
  id: (prefix) => `${prefix}_${randomUUID().replaceAll('-', '').slice(0, 16)}`,
  secret: () => randomBytes(24).toString('base64url'),
};

// Predictable ids for tests: evt_1, evt_2, rsvp_1, ...
export function sequentialIds(): IdGenerator {
  const counters = new Map<string, number>();
  let secrets = 0;
  return {
    id(prefix) {
      const n = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, n);
      return `${prefix}_${n}`;
    },
    secret: () => `secret-${++secrets}`,
  };
}
