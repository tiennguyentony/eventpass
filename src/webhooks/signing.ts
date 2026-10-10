import { createHmac, timingSafeEqual } from 'node:crypto';

export const SIGNATURE_HEADER = 'x-eventpass-signature';
export const TIMESTAMP_HEADER = 'x-eventpass-timestamp';

// The signature covers the timestamp as well as the body, so a captured
// request can't be replayed later with a fresh timestamp. Receivers should
// reject timestamps older than a few minutes (see verifySignature).
export function sign(secret: string, timestamp: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

export interface VerifyInput {
  secret: string;
  timestamp: string | undefined;
  signature: string | undefined;
  body: string;
  now: Date;
  toleranceSeconds?: number;
}

// Shipped for organizers' receivers (and our own tests).
export function verifySignature(input: VerifyInput): boolean {
  const { secret, timestamp, signature, body, now, toleranceSeconds = 300 } = input;
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;

  const age = Math.abs(now.getTime() / 1000 - Number(timestamp));
  if (age > toleranceSeconds) return false;

  const expected = Buffer.from(sign(secret, timestamp, body));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
