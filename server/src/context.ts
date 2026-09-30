import type { Db } from './db';

/** Wspólne zależności przekazywane do wszystkich tras API. */
export interface Ctx {
  db: Db;
  uploadDir: string;
  jwtSecret: string;
}
