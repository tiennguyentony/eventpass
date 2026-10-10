import type { Request, RequestHandler } from 'express';
import type { Clock } from '../lib/clock';
import { AppError } from '../lib/errors';

interface Window {
  startedAt: number;
  count: number;
}

// Fixed-window limiter kept in memory. Good enough for a single instance.
export function rateLimit(opts: { max: number; windowMs: number; clock: Clock }): RequestHandler {
  const windows = new Map<string, Window>();

  return (req, res, next) => {
    const now = opts.clock.now().getTime();
    const key = clientAddress(req);

    let window = windows.get(key);
    if (!window || now - window.startedAt >= opts.windowMs) {
      window = { startedAt: now, count: 0 };
      windows.set(key, window);
    }
    window.count++;

    if (windows.size > 10_000) {
      for (const [k, w] of windows) {
        if (now - w.startedAt >= opts.windowMs) windows.delete(k);
      }
    }

    if (window.count > opts.max) {
      const retryAfter = Math.ceil((window.startedAt + opts.windowMs - now) / 1000);
      res.set('retry-after', String(retryAfter));
      throw new AppError(429, 'RATE_LIMITED', 'Too many requests, slow down');
    }
    next();
  };
}

// In production we sit behind a load balancer, so the socket address is the
// balancer's. Use the original client address it forwards.
function clientAddress(req: Request): string {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}
