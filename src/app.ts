import express, { type ErrorRequestHandler, type Express } from 'express';
import { ZodError } from 'zod';
import type { Config } from './config';
import { authRoutes } from './http/routes/auth';
import { eventRoutes } from './http/routes/events';
import { groupRoutes } from './http/routes/groups';
import { rsvpRoutes } from './http/routes/rsvps';
import type { Clock } from './lib/clock';
import { AppError } from './lib/errors';
import type { HttpClient } from './lib/httpClient';
import type { IdGenerator } from './lib/ids';
import type { Logger } from './lib/logger';
import type { Notifier } from './notifications/notifier';
import { AuthService } from './services/authService';
import { EventService } from './services/eventService';
import { GroupService } from './services/groupService';
import { RsvpService } from './services/rsvpService';
import type { Store } from './store/store';
import { WebhookService } from './webhooks/webhookService';

export interface AppDeps {
  store: Store;
  clock: Clock;
  ids: IdGenerator;
  http: HttpClient;
  notifier: Notifier;
  logger: Logger;
  config: Config;
}

export function buildServices(deps: AppDeps) {
  const { store, clock, ids, http, logger, config } = deps;
  const webhooks = new WebhookService({ http, clock, logger });
  return {
    ...deps,
    auth: new AuthService({ store, clock, ids }),
    events: new EventService({ store, clock, ids }),
    groups: new GroupService({ store, ids }),
    rsvps: new RsvpService({ store, clock, ids, webhooks, rsvpCloseHours: config.rsvpCloseHours }),
    webhooks,
  };
}

export type Services = ReturnType<typeof buildServices>;

// Composition root. Everything with side effects (time, ids, storage, network,
// email, logging) comes in through deps, so tests can replace it.
export function createApp(deps: AppDeps): { app: Express; services: Services } {
  const services = buildServices(deps);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use(authRoutes(services));
  app.use(groupRoutes(services));
  app.use(eventRoutes(services));
  app.use(rsvpRoutes(services));

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such route' } });
  });
  app.use(errorHandler(deps.logger));

  return { app, services };
}

function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message } });
      return;
    }
    if (err instanceof ZodError) {
      res.status(400).json({ error: { code: 'VALIDATION_FAILED', message: 'Invalid request', issues: err.issues } });
      return;
    }
    if (err?.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Body is not valid JSON' } });
      return;
    }
    logger.error('unhandled error', { method: req.method, path: req.path, error: String(err?.stack ?? err) });
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
  };
}
