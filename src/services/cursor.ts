import { badRequest } from '../lib/errors';

// Opaque cursor for keyset pagination: the sort key and id of the last item
// on the previous page. Because the next page starts *after* that key rather
// than at an offset, events inserted meanwhile can't shift items between
// pages (no duplicates, no skips).
export interface CursorKey {
  startsAt: string;
  id: string;
}

export function encodeCursor(key: CursorKey): string {
  return Buffer.from(JSON.stringify([key.startsAt, key.id])).toString('base64url');
}

export function decodeCursor(cursor: string): CursorKey {
  try {
    const [startsAt, id] = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (typeof startsAt !== 'string' || typeof id !== 'string') throw new Error('bad shape');
    return { startsAt, id };
  } catch {
    throw badRequest('INVALID_CURSOR', 'Cursor is not valid');
  }
}

export function compareKeys(a: CursorKey, b: CursorKey): number {
  if (a.startsAt !== b.startsAt) return a.startsAt < b.startsAt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}
