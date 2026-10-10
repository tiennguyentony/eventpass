// Services throw AppError; the error middleware in app.ts turns it into JSON.
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what: string) => new AppError(404, 'NOT_FOUND', `${what} not found`);

export const unauthorized = () => new AppError(401, 'UNAUTHORIZED', 'Login required');

export const forbidden = (message = 'Not allowed') => new AppError(403, 'FORBIDDEN', message);

export const conflict = (code: string, message: string) => new AppError(409, code, message);

export const badRequest = (code: string, message: string) => new AppError(400, code, message);
