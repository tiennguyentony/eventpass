import type { User } from '../domain/models';
import type { Clock } from '../lib/clock';
import { unauthorized } from '../lib/errors';
import type { IdGenerator } from '../lib/ids';
import type { Store } from '../store/store';

// Demo login: email only, no password. Demo users are listed in the README.
export class AuthService {
  constructor(private readonly deps: { store: Store; clock: Clock; ids: IdGenerator }) {}

  login(email: string): { token: string; user: User } {
    const user = this.deps.store.findUserByEmail(email);
    if (!user) throw unauthorized();
    const token = this.deps.ids.secret();
    this.deps.store.saveSession({ token, userId: user.id, createdAt: this.deps.clock.now().toISOString() });
    return { token, user };
  }

  userForToken(token: string): User | undefined {
    const session = this.deps.store.getSession(token);
    return session && this.deps.store.getUser(session.userId);
  }
}
