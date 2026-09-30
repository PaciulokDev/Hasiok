import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, uid } from '../auth';
import type { Ctx } from '../context';
import { run } from '../db';
import { HttpError } from '../errors';
import { getUserRow, isBlocked, toPublicProfile } from '../profiles';

const reportSchema = z.object({ reason: z.string().trim().min(3, 'Opisz krótko, co jest nie tak').max(500) });

export function userRoutes(ctx: Ctx): Router {
  const { db } = ctx;
  const router = Router();
  router.use(requireAuth(ctx.jwtSecret));

  function targetId(me: number, raw: string): number {
    const id = Number(raw);
    if (id === me) throw new HttpError(400, 'To Twój własny profil');
    getUserRow(db, id);
    return id;
  }

  router.get('/users/:id', (req, res) => {
    const me = uid(req);
    const id = Number(req.params.id);
    if (id !== me && isBlocked(db, me, id)) throw new HttpError(404, 'Nie ma takiego użytkownika');
    res.json(toPublicProfile(db, getUserRow(db, id)));
  });

  /** Zgłoszenie trafia do moderacji — np. gdy ktoś wrzuca swoje zdjęcia zamiast memów. */
  router.post('/users/:id/report', (req, res) => {
    const me = uid(req);
    const id = targetId(me, req.params.id);
    const { reason } = reportSchema.parse(req.body);
    run(db, 'INSERT INTO reports (reporter_id, reported_id, reason) VALUES (?, ?, ?)', me, id, reason);
    res.status(204).end();
  });

  router.post('/users/:id/block', (req, res) => {
    const me = uid(req);
    const id = targetId(me, req.params.id);
    run(db, 'INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)', me, id);
    const [a, b] = me < id ? [me, id] : [id, me];
    run(db, 'DELETE FROM matches WHERE user_a = ? AND user_b = ?', a, b);
    res.status(204).end();
  });

  return router;
}
