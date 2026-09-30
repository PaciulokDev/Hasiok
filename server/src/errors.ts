import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    res.status(400).json({ error: first ? `${first.path.join('.')}: ${first.message}` : 'Niepoprawne dane' });
    return;
  }
  if (err && typeof err === 'object' && 'code' in err && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'Plik jest za duży (max 5 MB)' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Coś poszło nie tak po stronie serwera' });
}
