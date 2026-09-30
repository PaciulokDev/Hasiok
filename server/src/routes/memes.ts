import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { HUMOR_TAG_IDS, LIMITS, REACTIONS, type FeedMeme, type ReactionId } from '@hasiok/shared';
import { requireAuth, uid } from '../auth';
import type { Ctx } from '../context';
import { all, one, run } from '../db';
import { HttpError } from '../errors';
import { toMeme } from '../profiles';

/** Rozpoznaje format obrazka po pierwszych bajtach pliku (nie ufamy nazwie ani nagłówkom). */
export function detectImageType(buf: Buffer): 'jpg' | 'png' | 'gif' | 'webp' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'GIF8') return 'gif';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

const uploadSchema = z.object({
  caption: z.string().trim().max(LIMITS.maxCaptionLength).default(''),
  tags: z
    .string()
    .default('[]')
    .transform((s, c) => {
      try {
        return JSON.parse(s);
      } catch {
        c.addIssue({ code: 'custom', message: 'Niepoprawne kategorie' });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.enum(HUMOR_TAG_IDS as [string, ...string[]])).min(1, 'Wybierz co najmniej jedną kategorię').max(LIMITS.maxTagsPerMeme)),
});

const reactionSchema = z.object({
  reaction: z.enum(REACTIONS.map((r) => r.id) as [ReactionId, ...ReactionId[]]),
});

export function memeRoutes(ctx: Ctx): Router {
  const { db } = ctx;
  const router = Router();
  router.use(requireAuth(ctx.jwtSecret));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: LIMITS.maxUploadBytes, files: 1 } });

  router.post('/memes', upload.single('image'), (req, res) => {
    const userId = uid(req);
    const { caption, tags } = uploadSchema.parse(req.body);
    if (!req.file) throw new HttpError(400, 'Dodaj obrazek z memem');
    const ext = detectImageType(req.file.buffer);
    if (!ext) throw new HttpError(400, 'Obsługujemy tylko JPG, PNG, GIF i WEBP');

    const count = one(db, 'SELECT COUNT(*) AS n FROM memes WHERE owner_id = ?', userId);
    if (Number(count?.n) >= LIMITS.maxMemesPerProfile) {
      throw new HttpError(400, `Galeria może mieć maksymalnie ${LIMITS.maxMemesPerProfile} memów`);
    }

    const fileName = `${crypto.randomUUID()}.${ext}`;
    fs.mkdirSync(ctx.uploadDir, { recursive: true });
    fs.writeFileSync(path.join(ctx.uploadDir, fileName), req.file.buffer);
    const { id } = run(
      db,
      'INSERT INTO memes (owner_id, file_name, caption, tags) VALUES (?, ?, ?, ?)',
      userId,
      fileName,
      caption,
      JSON.stringify([...new Set(tags)]),
    );
    res.status(201).json(toMeme(one(db, 'SELECT * FROM memes WHERE id = ?', id)!));
  });

  router.delete('/memes/:id', (req, res) => {
    const meme = one(db, 'SELECT * FROM memes WHERE id = ? AND owner_id = ?', Number(req.params.id), uid(req));
    if (!meme) throw new HttpError(404, 'Nie ma takiego mema w Twojej galerii');
    run(db, 'DELETE FROM memes WHERE id = ?', meme.id);
    fs.rmSync(path.join(ctx.uploadDir, meme.file_name), { force: true });
    res.status(204).end();
  });

  /** Memy innych osób do oceny — to z nich uczymy się Twojego poczucia humoru. */
  router.get('/feed', (req, res) => {
    const userId = uid(req);
    const rows = all(
      db,
      `SELECT m.*, u.nickname AS owner_nickname
         FROM memes m JOIN users u ON u.id = m.owner_id
        WHERE m.owner_id != ?1
          AND NOT EXISTS (SELECT 1 FROM reactions r WHERE r.user_id = ?1 AND r.meme_id = m.id)
          AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = ?1 AND b.blocked_id = m.owner_id)
                                                  OR (b.blocker_id = m.owner_id AND b.blocked_id = ?1))
        ORDER BY RANDOM()
        LIMIT 20`,
      userId,
    );
    const feed: FeedMeme[] = rows.map((row) => ({ ...toMeme(row), ownerNickname: row.owner_nickname, myReaction: null }));
    res.json(feed);
  });

  router.post('/memes/:id/reaction', (req, res) => {
    const userId = uid(req);
    const { reaction } = reactionSchema.parse(req.body);
    const meme = one(db, 'SELECT owner_id FROM memes WHERE id = ?', Number(req.params.id));
    if (!meme) throw new HttpError(404, 'Nie ma takiego mema');
    if (meme.owner_id === userId) throw new HttpError(400, 'Nie oceniasz własnych memów 😉');
    run(
      db,
      `INSERT INTO reactions (user_id, meme_id, reaction) VALUES (?, ?, ?)
       ON CONFLICT (user_id, meme_id) DO UPDATE SET reaction = excluded.reaction`,
      userId,
      Number(req.params.id),
      reaction,
    );
    res.status(204).end();
  });

  return router;
}
