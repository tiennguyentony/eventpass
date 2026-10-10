import { Router } from 'express';
import { z } from 'zod';
import type { Services } from '../../app';
import { currentUser, requireUser } from '../auth';
import { rsvpDto } from '../dto';
import { rateLimit } from '../rateLimit';

const Params = z.object({ id: z.string() });
const RsvpParams = z.object({ id: z.string(), rsvpId: z.string() });

export function rsvpRoutes(services: Services): Router {
  const router = Router();
  const { max, windowMs } = services.config.rsvpRateLimit;
  const limit = rateLimit({ max, windowMs, clock: services.clock });
  const auth = requireUser(services.auth);
  const JoinBody = z.object({ guests: z.number().int().min(0).max(services.config.maxGuests).default(0) });

  router.post('/events/:id/rsvps', limit, auth, (req, res) => {
    const { id } = Params.parse(req.params);
    const { guests } = JoinBody.parse(req.body ?? {});
    const rsvp = services.rsvps.join(currentUser(res), id, guests);
    res.status(201).json({ rsvp: rsvpDto(rsvp) });
  });

  router.delete('/events/:id/rsvps/:rsvpId', limit, auth, (req, res) => {
    const { id, rsvpId } = RsvpParams.parse(req.params);
    const rsvp = services.rsvps.cancel(currentUser(res), id, rsvpId);
    res.json({ rsvp: rsvpDto(rsvp) });
  });

  return router;
}
