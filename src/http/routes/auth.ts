import { Router } from 'express';
import { z } from 'zod';
import type { Services } from '../../app';
import { currentUser, requireUser } from '../auth';
import { eventDto, rsvpDto } from '../dto';

const LoginBody = z.object({ email: z.email() });

export function authRoutes(services: Services): Router {
  const router = Router();

  router.post('/auth/login', (req, res) => {
    const { email } = LoginBody.parse(req.body);
    const { token, user } = services.auth.login(email);
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  });

  // The signed-in member's upcoming RSVPs.
  router.get('/me/rsvps', requireUser(services.auth), (req, res) => {
    const user = currentUser(res);
    const now = services.clock.now().toISOString();
    const items = services.store
      .listRsvpsForUser(user.id)
      .filter((r) => r.status === 'going')
      .map((r) => ({ rsvp: r, event: services.events.get(r.eventId) }))
      .filter(({ event }) => event.startsAt >= now)
      .sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt))
      .map(({ rsvp, event }) => ({ ...rsvpDto(rsvp), event: eventDto(event, services.rsvps.spotsLeft(event)) }));
    res.json({ items });
  });

  return router;
}
