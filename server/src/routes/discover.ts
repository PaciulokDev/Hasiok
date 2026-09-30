import { Router } from 'express';
import { z } from 'zod';
import { compatibility, type Candidate, type SwipeResult } from '@hasiok/shared';
import { requireAuth, uid } from '../auth';
import type { Ctx } from '../context';
import { all, one, run, transaction } from '../db';
import { HttpError } from '../errors';
import { getMyProfile, isBlocked, loadSignals, toPublicProfile } from '../profiles';

const swipeSchema = z.object({ userId: z.number().int(), liked: z.boolean() });

export function discoverRoutes(ctx: Ctx): Router {
  const { db } = ctx;
  const router = Router();
  router.use(requireAuth(ctx.jwtSecret));

  /**
   * Kandydaci do poznania: pasujące preferencje (płeć, wiek) w obie strony,
   * co najmniej jeden mem w galerii, jeszcze nieoceneni — posortowani wg dopasowania humoru.
   */
  router.get('/discover', (req, res) => {
    const me = getMyProfile(db, uid(req));
    const year = new Date().getFullYear();
    const rows = all(
      db,
      `SELECT u.* FROM users u
        WHERE u.id != ?1
          AND EXISTS (SELECT 1 FROM memes m WHERE m.owner_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.from_id = ?1 AND s.to_id = u.id)
          AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = ?1 AND b.blocked_id = u.id)
                                                  OR (b.blocker_id = u.id AND b.blocked_id = ?1))
          AND EXISTS (SELECT 1 FROM json_each(?2) WHERE value = u.gender)
          AND EXISTS (SELECT 1 FROM json_each(u.looking_for) WHERE value = ?3)
          AND (?4 - u.birth_year) BETWEEN ?5 AND ?6
          AND ?7 BETWEEN u.age_min AND u.age_max`,
      me.id,
      JSON.stringify(me.lookingFor),
      me.gender,
      year,
      me.ageMin,
      me.ageMax,
      me.age,
    );

    const signals = loadSignals(db, [me.id, ...rows.map((r) => r.id)]);
    const mine = signals.get(me.id)!;
    const candidates: Candidate[] = rows
      .map((row) => {
        const { score, reasons } = compatibility(mine, signals.get(row.id)!);
        return { profile: toPublicProfile(db, row), score, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    res.json(candidates);
  });

  router.post('/swipes', (req, res) => {
    const me = uid(req);
    const { userId, liked } = swipeSchema.parse(req.body);
    if (userId === me) throw new HttpError(400, 'Nie możesz polubić samego siebie (choć to zdrowe)');
    if (!one(db, 'SELECT 1 FROM users WHERE id = ?', userId)) throw new HttpError(404, 'Nie ma takiego użytkownika');
    if (isBlocked(db, me, userId)) throw new HttpError(403, 'Ta osoba jest niedostępna');

    const result: SwipeResult = transaction(db, () => {
      run(
        db,
        `INSERT INTO swipes (from_id, to_id, liked) VALUES (?, ?, ?)
         ON CONFLICT (from_id, to_id) DO UPDATE SET liked = excluded.liked`,
        me,
        userId,
        liked ? 1 : 0,
      );
      const likedBack = liked && one(db, 'SELECT 1 FROM swipes WHERE from_id = ? AND to_id = ? AND liked = 1', userId, me);
      if (!likedBack) return { matched: false, matchId: null };

      const [a, b] = me < userId ? [me, userId] : [userId, me];
      run(db, 'INSERT OR IGNORE INTO matches (user_a, user_b) VALUES (?, ?)', a, b);
      const match = one(db, 'SELECT id FROM matches WHERE user_a = ? AND user_b = ?', a, b)!;
      return { matched: true, matchId: match.id };
    });
    res.json(result);
  });

  return router;
}
