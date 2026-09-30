import {
  isHumorTag,
  reactionValue,
  type Gender,
  type HumorSignals,
  type HumorTag,
  type Meme,
  type MyProfile,
  type PublicProfile,
  type ReactionId,
} from '@hasiok/shared';
import { all, one, type Db, type Row } from './db';
import { HttpError } from './errors';

export function ageFromBirthYear(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

function parseTags(json: string): HumorTag[] {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.filter(isHumorTag) : [];
  } catch {
    return [];
  }
}

export function toMeme(row: Row): Meme {
  return {
    id: row.id,
    ownerId: row.owner_id,
    imageUrl: `/uploads/${row.file_name}`,
    caption: row.caption,
    tags: parseTags(row.tags),
    createdAt: row.created_at,
  };
}

export function memesOf(db: Db, userId: number): Meme[] {
  return all(db, 'SELECT * FROM memes WHERE owner_id = ? ORDER BY id DESC', userId).map(toMeme);
}

export function toPublicProfile(db: Db, row: Row): PublicProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    age: ageFromBirthYear(row.birth_year),
    city: row.city,
    bio: row.bio,
    gender: row.gender as Gender,
    humorTags: parseTags(row.humor_tags),
    memes: memesOf(db, row.id),
  };
}

export function getUserRow(db: Db, userId: number): Row {
  const row = one(db, 'SELECT * FROM users WHERE id = ?', userId);
  if (!row) throw new HttpError(404, 'Nie ma takiego użytkownika');
  return row;
}

export function getMyProfile(db: Db, userId: number): MyProfile {
  const row = getUserRow(db, userId);
  const reactions = one(db, 'SELECT COUNT(*) AS n FROM reactions WHERE user_id = ?', userId);
  return {
    ...toPublicProfile(db, row),
    email: row.email,
    birthYear: row.birth_year,
    lookingFor: JSON.parse(row.looking_for),
    ageMin: row.age_min,
    ageMax: row.age_max,
    reactionsCount: Number(reactions?.n ?? 0),
  };
}

/** Wczytuje sygnały humoru (profil, własne memy, reakcje) dla wielu osób naraz. */
export function loadSignals(db: Db, userIds: number[]): Map<number, HumorSignals> {
  const result = new Map<number, HumorSignals>();
  if (userIds.length === 0) return result;
  const placeholders = userIds.map(() => '?').join(',');

  for (const row of all(db, `SELECT id, humor_tags FROM users WHERE id IN (${placeholders})`, ...userIds)) {
    result.set(row.id, { userId: row.id, declaredTags: parseTags(row.humor_tags), ownMemes: [], reactions: {} });
  }
  for (const row of all(db, `SELECT id, owner_id, tags FROM memes WHERE owner_id IN (${placeholders})`, ...userIds)) {
    result.get(row.owner_id)?.ownMemes.push({ id: row.id, tags: parseTags(row.tags) });
  }
  const reactions = all(
    db,
    `SELECT r.user_id, r.meme_id, r.reaction, m.tags
       FROM reactions r JOIN memes m ON m.id = r.meme_id
      WHERE r.user_id IN (${placeholders})`,
    ...userIds,
  );
  for (const row of reactions) {
    const signals = result.get(row.user_id);
    if (signals) {
      signals.reactions[row.meme_id] = { value: reactionValue(row.reaction as ReactionId), tags: parseTags(row.tags) };
    }
  }
  return result;
}

/** Czy któraś ze stron zablokowała drugą. */
export function isBlocked(db: Db, a: number, b: number): boolean {
  return !!one(
    db,
    'SELECT 1 FROM blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
    a,
    b,
    b,
    a,
  );
}
