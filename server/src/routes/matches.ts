import { Router } from 'express';
import { z } from 'zod';
import { compatibility, LIMITS, type MatchSummary, type Message } from '@hasiok/shared';
import { requireAuth, uid } from '../auth';
import type { Ctx } from '../context';
import { all, one, run, type Db, type Row } from '../db';
import { HttpError } from '../errors';
import { getUserRow, loadSignals, toMeme, toPublicProfile } from '../profiles';

const messageSchema = z
  .object({
    body: z.string().trim().max(LIMITS.maxMessageLength).default(''),
    memeId: z.number().int().optional(),
  })
  .refine((m) => m.body.length > 0 || m.memeId !== undefined, 'Wiadomość nie może być pusta');

function toMessage(db: Db, row: Row): Message {
  const meme = row.meme_id ? one(db, 'SELECT * FROM memes WHERE id = ?', row.meme_id) : undefined;
  return {
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    body: row.body,
    meme: meme ? toMeme(meme) : null,
    createdAt: row.created_at,
  };
}

/** Zwraca parę, jeśli zalogowana osoba do niej należy. */
function getMyMatch(db: Db, matchId: number, me: number): Row {
  const match = one(db, 'SELECT * FROM matches WHERE id = ? AND (user_a = ? OR user_b = ?)', matchId, me, me);
  if (!match) throw new HttpError(404, 'Nie ma takiej pary');
  return match;
}

export function matchRoutes(ctx: Ctx): Router {
  const { db } = ctx;
  const router = Router();
  router.use(requireAuth(ctx.jwtSecret));

  router.get('/matches', (req, res) => {
    const me = uid(req);
    const rows = all(db, 'SELECT * FROM matches WHERE user_a = ?1 OR user_b = ?1 ORDER BY id DESC', me);
    const otherIds = rows.map((m) => (m.user_a === me ? m.user_b : m.user_a));
    const signals = loadSignals(db, [me, ...otherIds]);

    const result: MatchSummary[] = rows.map((match, i) => {
      const otherId = otherIds[i];
      const last = one(db, 'SELECT * FROM messages WHERE match_id = ? ORDER BY id DESC LIMIT 1', match.id);
      return {
        id: match.id,
        createdAt: match.created_at,
        score: compatibility(signals.get(me)!, signals.get(otherId)!).score,
        other: toPublicProfile(db, getUserRow(db, otherId)),
        lastMessage: last ? toMessage(db, last) : null,
      };
    });
    // Najpierw rozmowy z najświeższą aktywnością.
    result.sort((a, b) => (b.lastMessage?.id ?? 0) - (a.lastMessage?.id ?? 0) || b.id - a.id);
    res.json(result);
  });

  router.get('/matches/:id/messages', (req, res) => {
    const match = getMyMatch(db, Number(req.params.id), uid(req));
    const after = Number(req.query.after ?? 0) || 0;
    const rows = all(db, 'SELECT * FROM messages WHERE match_id = ? AND id > ? ORDER BY id LIMIT 200', match.id, after);
    res.json(rows.map((row) => toMessage(db, row)));
  });

  router.post('/matches/:id/messages', (req, res) => {
    const me = uid(req);
    const match = getMyMatch(db, Number(req.params.id), me);
    const { body, memeId } = messageSchema.parse(req.body);
    if (memeId !== undefined && !one(db, 'SELECT 1 FROM memes WHERE id = ?', memeId)) {
      throw new HttpError(404, 'Nie ma takiego mema');
    }
    const { id } = run(
      db,
      'INSERT INTO messages (match_id, sender_id, body, meme_id) VALUES (?, ?, ?, ?)',
      match.id,
      me,
      body,
      memeId ?? null,
    );
    res.status(201).json(toMessage(db, one(db, 'SELECT * FROM messages WHERE id = ?', id)!));
  });

  router.delete('/matches/:id', (req, res) => {
    const me = uid(req);
    const match = getMyMatch(db, Number(req.params.id), me);
    const other = match.user_a === me ? match.user_b : match.user_a;
    run(db, 'DELETE FROM matches WHERE id = ?', match.id);
    // Odrzucamy tę osobę, żeby nie wróciła w "Odkrywaj".
    run(
      db,
      `INSERT INTO swipes (from_id, to_id, liked) VALUES (?, ?, 0)
       ON CONFLICT (from_id, to_id) DO UPDATE SET liked = 0`,
      me,
      other,
    );
    res.status(204).end();
  });

  return router;
}
