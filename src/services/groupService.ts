import type { Group, User } from '../domain/models';
import { notFound } from '../lib/errors';
import type { IdGenerator } from '../lib/ids';
import type { Store } from '../store/store';
import { requireOrganizerOf } from './permissions';

export class GroupService {
  constructor(private readonly deps: { store: Store; ids: IdGenerator }) {}

  get(id: string): Group {
    const group = this.deps.store.getGroup(id);
    if (!group) throw notFound('Group');
    return group;
  }

  list(): Group[] {
    return this.deps.store.listGroups();
  }

  // Replaces any existing webhook. The secret is only shown in this response;
  // organizers use it to verify our signatures.
  setWebhook(user: User, groupId: string, url: string): { url: string; secret: string } {
    const group = requireOrganizerOf(this.deps.store, user, groupId);
    const webhook = { url, secret: this.deps.ids.secret() };
    this.deps.store.saveGroup({ ...group, webhook });
    return webhook;
  }

  removeWebhook(user: User, groupId: string): void {
    const group = requireOrganizerOf(this.deps.store, user, groupId);
    const { webhook: _removed, ...rest } = group;
    this.deps.store.saveGroup(rest);
  }
}
