import { Router } from 'express';
import { z } from 'zod';
import type { Services } from '../../app';
import { currentUser, requireUser } from '../auth';
import { groupDto } from '../dto';

const Params = z.object({ id: z.string() });
const WebhookBody = z.object({ url: z.url({ protocol: /^https?$/ }) });

export function groupRoutes(services: Services): Router {
  const router = Router();
  const auth = requireUser(services.auth);

  router.get('/groups', (_req, res) => {
    res.json({ items: services.groups.list().map(groupDto) });
  });

  router.get('/groups/:id', (req, res) => {
    res.json({ group: groupDto(services.groups.get(Params.parse(req.params).id)) });
  });

  router.put('/groups/:id/webhook', auth, (req, res) => {
    const { id } = Params.parse(req.params);
    const { url } = WebhookBody.parse(req.body);
    const webhook = services.groups.setWebhook(currentUser(res), id, url);
    res.json({ webhook });
  });

  router.delete('/groups/:id/webhook', auth, (req, res) => {
    services.groups.removeWebhook(currentUser(res), Params.parse(req.params).id);
    res.status(204).end();
  });

  return router;
}
