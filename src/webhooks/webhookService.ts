import type { Clock } from '../lib/clock';
import type { HttpClient } from '../lib/httpClient';
import type { Logger } from '../lib/logger';
import type { Webhook } from '../domain/models';
import { SIGNATURE_HEADER, TIMESTAMP_HEADER, sign } from './signing';

export interface WebhookPayload {
  type: 'rsvp.created' | 'rsvp.cancelled';
  eventId: string;
  rsvp: { id: string; userId: string; status: string; guests: number };
  occurredAt: string;
}

export class WebhookService {
  constructor(
    private readonly deps: { http: HttpClient; clock: Clock; logger: Logger },
  ) {}

  async deliver(webhook: Webhook, payload: WebhookPayload): Promise<void> {
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(this.deps.clock.now().getTime() / 1000));
    const res = await this.deps.http.post(webhook.url, body, {
      'content-type': 'application/json',
      [TIMESTAMP_HEADER]: timestamp,
      [SIGNATURE_HEADER]: sign(webhook.secret, timestamp, body),
    });
    if (res.status >= 300) {
      this.deps.logger.warn('webhook rejected', { url: webhook.url, status: res.status, type: payload.type });
    }
  }
}
