import type { Group, User } from '../domain/models';
import { forbidden, notFound } from '../lib/errors';
import type { Store } from '../store/store';

export function requireOrganizerOf(store: Store, user: User, groupId: string): Group {
  const group = store.getGroup(groupId);
  if (!group) throw notFound('Group');
  if (group.organizerId !== user.id) throw forbidden('Only the group organizer can do that');
  return group;
}
