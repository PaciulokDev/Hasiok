import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './errors';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

export function signToken(userId: number, secret: string): string {
  return jwt.sign({ sub: String(userId) }, secret, { expiresIn: '30d' });
}

declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

export function requireAuth(secret: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Musisz się zalogować');
    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      req.userId = Number(payload.sub);
    } catch {
      throw new HttpError(401, 'Sesja wygasła, zaloguj się ponownie');
    }
    next();
  };
}

/** Id zalogowanego użytkownika (po `requireAuth`). */
export function uid(req: Request): number {
  if (!req.userId) throw new HttpError(401, 'Musisz się zalogować');
  return req.userId;
}
