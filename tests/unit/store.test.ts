import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor } from '../../src/services/cursor';
import { JsonFileStore } from '../../src/store/jsonFileStore';
import { MemoryStore } from '../../src/store/memoryStore';

const user = { id: 'usr_1', email: 'Ann@Example.com', name: 'Ann', role: 'member' as const };

describe('MemoryStore', () => {
  it('finds users by email, ignoring case', () => {
    const store = new MemoryStore();
    store.saveUser(user);
    expect(store.findUserByEmail('ann@example.com')?.id).toBe('usr_1');
  });

  it('returns copies, so callers must save to change data', () => {
    const store = new MemoryStore();
    store.saveUser(user);
    store.getUser('usr_1')!.name = 'Changed';
    expect(store.getUser('usr_1')!.name).toBe('Ann');
  });
});

describe('JsonFileStore', () => {
  let dir: string;
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('writes a snapshot on every change and loads it again', () => {
    dir = mkdtempSync(join(tmpdir(), 'eventpass-'));
    const file = join(dir, 'data', 'eventpass.json');

    const first = JsonFileStore.open(file);
    first.saveUser(user);
    expect(JSON.parse(readFileSync(file, 'utf8')).users).toHaveLength(1);

    const second = JsonFileStore.open(file);
    expect(second.getUser('usr_1')?.email).toBe('Ann@Example.com');
  });
});

describe('cursor', () => {
  it('round-trips the sort key', () => {
    const key = { startsAt: '2027-01-14T19:00:00.000Z', id: 'evt_9' };
    expect(decodeCursor(encodeCursor(key))).toEqual(key);
  });

  it('rejects garbage with a 400', () => {
    expect(() => decodeCursor('not-a-cursor')).toThrow(expect.objectContaining({ status: 400 }));
  });
});
