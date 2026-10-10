import { describe, expect, it } from 'vitest';
import { sign, verifySignature } from '../../src/webhooks/signing';

const now = new Date('2027-01-11T09:00:00.000Z');
const timestamp = String(now.getTime() / 1000);
const body = '{"type":"rsvp.created"}';

describe('webhook signatures', () => {
  it('verifies a signature it produced', () => {
    const signature = sign('s3cret', timestamp, body);
    expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(verifySignature({ secret: 's3cret', timestamp, signature, body, now })).toBe(true);
  });

  it('rejects a tampered body or the wrong secret', () => {
    const signature = sign('s3cret', timestamp, body);
    expect(verifySignature({ secret: 's3cret', timestamp, signature, body: body + ' ', now })).toBe(false);
    expect(verifySignature({ secret: 'other', timestamp, signature, body, now })).toBe(false);
  });

  it('rejects old timestamps so captured requests cannot be replayed', () => {
    const signature = sign('s3cret', timestamp, body);
    const later = new Date(now.getTime() + 10 * 60_000);
    expect(verifySignature({ secret: 's3cret', timestamp, signature, body, now: later })).toBe(false);
  });

  it('rejects missing headers', () => {
    expect(verifySignature({ secret: 's3cret', timestamp: undefined, signature: 'x', body, now })).toBe(false);
    expect(verifySignature({ secret: 's3cret', timestamp, signature: undefined, body, now })).toBe(false);
  });
});
