import { Router } from 'express';
import { z } from 'zod';
import type { Services } from '../../app';
import { MAX_OCCURRENCES } from '../../domain/recurrence';
import { isValidTimeZone, parseLocalDateTime } from '../../lib/time';
import { currentUser, requireUser } from '../auth';
import { eventDto } from '../dto';
import { ListingCache } from '../listingCache';

const localDateTime = z
  .string()
  .refine((v) => parseLocalDateTime(v) !== null, 'Use local time like 2027-03-18T19:00');

const CreateEventBody = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().max(2000).default(''),
  venue: z.string().trim().min(1).max(200),
  startsAt: localDateTime,
  timezone: z.string().refine(isValidTimeZone, 'Unknown time zone'),
  durationMinutes: z.number().int().min(15).max(24 * 60),
  capacity: z.number().int().min(1).max(10_000),
  repeatWeekly: z.number().int().min(2).max(MAX_OCCURRENCES).optional(),
});

const UpdateEventBody = z
  .object({
    title: z.string().trim().min(3).max(120),
    description: z.string().max(2000),
    venue: z.string().trim().min(1).max(200),
    startsAt: localDateTime,
    durationMinutes: z.number().int().min(15).max(24 * 60),
    capacity: z.number().int().min(1).max(10_000),
  })
  .partial();

const SearchQuery = z.object({
  q: z.string().max(100).optional(),
  groupId: z.string().optional(),
  from: z.iso.datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});

const IdParams = z.object({ id: z.string() });
const GroupParams = z.object({ groupId: z.string() });

export function eventRoutes(services: Services): Router {
  const router = Router();
  const auth = requireUser(services.auth);
  const cache = new ListingCache<object>(services.config.listingCacheTtlMs, services.clock);

  router.get('/events', (req, res) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    if (cached) {
      res.set('x-cache', 'hit').json(cached);
      return;
    }

    const query = SearchQuery.parse(req.query);
    const result = services.events.search({ ...query, from: query.from ? new Date(query.from) : undefined });
    const body = {
      items: result.items.map((e) => eventDto(e, services.rsvps.spotsLeft(e))),
      nextCursor: result.nextCursor,
    };
    cache.set(key, body);
    res.set('x-cache', 'miss').json(body);
  });

  router.get('/events/:id', (req, res) => {
    const event = services.events.get(IdParams.parse(req.params).id);
    res.json({ event: eventDto(event, services.rsvps.spotsLeft(event)) });
  });

  router.post('/groups/:groupId/events', auth, (req, res) => {
    const { groupId } = GroupParams.parse(req.params);
    const input = CreateEventBody.parse(req.body);
    const events = services.events.create(currentUser(res), groupId, input);
    res.status(201).json({ events: events.map((e) => eventDto(e, e.capacity)) });
  });

  router.patch('/events/:id', auth, (req, res) => {
    const { id } = IdParams.parse(req.params);
    const changes = UpdateEventBody.parse(req.body);
    const event = services.events.update(currentUser(res), id, changes);
    res.json({ event: eventDto(event, services.rsvps.spotsLeft(event)) });
  });

  router.get('/events/:id/attendees.csv', auth, (req, res) => {
    const { id } = IdParams.parse(req.params);
    const csv = services.rsvps.exportAttendees(currentUser(res), id);
    res.type('text/csv').set('content-disposition', `attachment; filename="attendees-${id}.csv"`).send(csv);
  });

  return router;
}
