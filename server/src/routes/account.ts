import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { z } from 'zod';
import { HUMOR_TAG_IDS, LIMITS, type AuthResponse } from '@hasiok/shared';
import { hashPassword, requireAuth, signToken, uid, verifyPassword } from '../auth';
import type { Ctx } from '../context';
import { all, one, run } from '../db';
import { HttpError } from '../errors';
import { getMyProfile } from '../profiles';

const gender = z.enum(['woman', 'man', 'nonbinary']);
const currentYear = new Date().getFullYear();
const birthYear = z
  .number()
  .int()
  .min(currentYear - 100, 'Niepoprawny rok urodzenia')
  .max(currentYear - LIMITS.minAge, `Musisz mieć co najmniej ${LIMITS.minAge} lat`);

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Niepoprawny e-mail'),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków').max(200),
  nickname: z.string().trim().min(2, 'Za krótki nick').max(30),
  birthYear,
  gender,
  lookingFor: z.array(gender).min(1, 'Wybierz, kogo szukasz'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

const updateSchema = z
  .object({
    nickname: z.string().trim().min(2).max(30),
    birthYear,
    city: z.string().trim().max(60),
    bio: z.string().trim().max(LIMITS.maxBioLength),
    gender,
    lookingFor: z.array(gender).min(1),
    ageMin: z.number().int().min(LIMITS.minAge).max(99),
    ageMax: z.number().int().min(LIMITS.minAge).max(99),
    humorTags: z.array(z.enum(HUMOR_TAG_IDS as [string, ...string[]])).max(LIMITS.maxHumorTags),
  })
  .partial();

export function accountRoutes(ctx: Ctx): Router {
  const { db } = ctx;
  const router = Router();
  const auth = requireAuth(ctx.jwtSecret);

  router.post('/auth/register', (req, res) => {
    const input = registerSchema.parse(req.body);
    if (one(db, 'SELECT 1 FROM users WHERE email = ?', input.email)) {
      throw new HttpError(409, 'Konto z tym e-mailem już istnieje');
    }
    const { id } = run(
      db,
      `INSERT INTO users (email, password_hash, nickname, birth_year, gender, looking_for)
       VALUES (?, ?, ?, ?, ?, ?)`,
      input.email,
      hashPassword(input.password),
      input.nickname,
      input.birthYear,
      input.gender,
      JSON.stringify([...new Set(input.lookingFor)]),
    );
    const body: AuthResponse = { token: signToken(id, ctx.jwtSecret), user: getMyProfile(db, id) };
    res.status(201).json(body);
  });

  router.post('/auth/login', (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const row = one(db, 'SELECT id, password_hash FROM users WHERE email = ?', email);
    if (!row || !verifyPassword(password, row.password_hash)) {
      throw new HttpError(401, 'Zły e-mail lub hasło');
    }
    const body: AuthResponse = { token: signToken(row.id, ctx.jwtSecret), user: getMyProfile(db, row.id) };
    res.json(body);
  });

  router.get('/me', auth, (req, res) => {
    res.json(getMyProfile(db, uid(req)));
  });

  router.put('/me', auth, (req, res) => {
    const update = updateSchema.parse(req.body);
    const me = getMyProfile(db, uid(req));
    const ageMin = update.ageMin ?? me.ageMin;
    const ageMax = update.ageMax ?? me.ageMax;
    if (ageMin > ageMax) throw new HttpError(400, 'Minimalny wiek nie może być większy od maksymalnego');

    run(
      db,
      `UPDATE users SET nickname = ?, birth_year = ?, city = ?, bio = ?, gender = ?,
              looking_for = ?, age_min = ?, age_max = ?, humor_tags = ?
        WHERE id = ?`,
      update.nickname ?? me.nickname,
      update.birthYear ?? me.birthYear,
      update.city ?? me.city,
      update.bio ?? me.bio,
      update.gender ?? me.gender,
      JSON.stringify([...new Set(update.lookingFor ?? me.lookingFor)]),
      ageMin,
      ageMax,
      JSON.stringify([...new Set(update.humorTags ?? me.humorTags)]),
      me.id,
    );
    res.json(getMyProfile(db, me.id));
  });

  router.delete('/me', auth, (req, res) => {
    const userId = uid(req);
    const files = all(db, 'SELECT file_name FROM memes WHERE owner_id = ?', userId);
    run(db, 'DELETE FROM users WHERE id = ?', userId);
    for (const f of files) fs.rmSync(path.join(ctx.uploadDir, f.file_name), { force: true });
    res.status(204).end();
  });

  return router;
}
