import type { RequestHandler, Response } from 'express';
import type { User } from '../domain/models';
import { unauthorized } from '../lib/errors';
import type { AuthService } from '../services/authService';

// Reads "Authorization: Bearer <token>" and stores the user in res.locals.
export function requireUser(auth: AuthService): RequestHandler {
  return (req, res, next) => {
    const header = req.get('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    const user = token ? auth.userForToken(token) : undefined;
    if (!user) throw unauthorized();
    res.locals.user = user;
    next();
  };
}

export function currentUser(res: Response): User {
  const user = res.locals.user as User | undefined;
  if (!user) throw unauthorized();
  return user;
}
