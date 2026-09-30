import { HUMOR_TAG_IDS, humorTagLabel, type HumorTag } from './humor';
import type { CompatibilityReason } from './types';

/**
 * Wszystko, co wiemy o poczuciu humoru jednej osoby.
 * `reactions` to mapa: id mema -> wartość reakcji (-1, 1 lub 2).
 */
export interface HumorSignals {
  userId: number;
  declaredTags: HumorTag[];
  ownMemes: { id: number; tags: HumorTag[] }[];
  reactions: Record<number, { value: number; tags: HumorTag[] }>;
}

export interface CompatibilityResult {
  /** Wynik 0–100. */
  score: number;
  reasons: CompatibilityReason[];
}

const MIN_REACTION = -1;
const MAX_REACTION = 2;

/** Wektor "gustu": dla każdej kategorii humoru — jak bardzo ta osoba ją lubi. */
export function humorVector(s: HumorSignals): number[] {
  const weights = new Map<HumorTag, number>();
  const add = (tag: HumorTag, w: number) => weights.set(tag, (weights.get(tag) ?? 0) + w);

  for (const tag of s.declaredTags) add(tag, 2);
  for (const meme of s.ownMemes) for (const tag of meme.tags) add(tag, 1);
  for (const r of Object.values(s.reactions)) for (const tag of r.tags) add(tag, r.value * 0.5);

  return HUMOR_TAG_IDS.map((tag) => weights.get(tag) ?? 0);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}

/** Pewność rośnie z liczbą obserwacji: 0 obserwacji -> 0, dużo -> blisko 1. */
function confidence(n: number, halfPoint: number): number {
  return n / (n + halfPoint);
}

/**
 * Liczy dopasowanie dwóch osób na podstawie:
 *  1. podobieństwa gustu (kategorie z profilu, własnych memów i reakcji),
 *  2. zgodności reakcji na te same memy,
 *  3. tego, jak każda z osób reaguje na memy drugiej.
 */
export function compatibility(a: HumorSignals, b: HumorSignals): CompatibilityResult {
  const reasons: CompatibilityReason[] = [];
  const parts: { value: number; weight: number }[] = [];

  // 1. Podobieństwo gustu.
  const taste = Math.max(0, cosineSimilarity(humorVector(a), humorVector(b)));
  parts.push({ value: taste, weight: 1 });

  // 2. Zgodność reakcji na te same memy.
  const range = MAX_REACTION - MIN_REACTION;
  let agreementSum = 0;
  let sharedCount = 0;
  let bothLaughed = 0;
  for (const [memeId, ra] of Object.entries(a.reactions)) {
    const rb = b.reactions[Number(memeId)];
    if (!rb) continue;
    sharedCount++;
    agreementSum += 1 - Math.abs(ra.value - rb.value) / range;
    if (ra.value === MAX_REACTION && rb.value === MAX_REACTION) bothLaughed++;
  }
  if (sharedCount > 0) {
    parts.push({ value: agreementSum / sharedCount, weight: 1.2 * confidence(sharedCount, 4) });
  }

  // 3. Reakcje na memy drugiej osoby (w obie strony).
  const crossValues: number[] = [];
  let bLikedA = 0;
  for (const meme of b.ownMemes) {
    const r = a.reactions[meme.id];
    if (r) crossValues.push(r.value);
  }
  for (const meme of a.ownMemes) {
    const r = b.reactions[meme.id];
    if (!r) continue;
    crossValues.push(r.value);
    if (r.value > 0) bLikedA++;
  }
  if (crossValues.length > 0) {
    const avg = crossValues.reduce((s, v) => s + (v - MIN_REACTION) / range, 0) / crossValues.length;
    parts.push({ value: avg, weight: 0.8 * confidence(crossValues.length, 2) });
  }

  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const raw = parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight;
  const score = Math.round(Math.min(1, Math.max(0, raw)) * 100);

  const sharedTags = a.declaredTags.filter((t) => b.declaredTags.includes(t));
  if (sharedTags.length > 0) {
    reasons.push({
      kind: 'shared-tags',
      text: `Wspólny humor: ${sharedTags.slice(0, 3).map(humorTagLabel).join(', ')}`,
    });
  }
  if (bothLaughed > 0) {
    reasons.push({
      kind: 'same-memes',
      text: `${bothLaughed} ${pluralMemes(bothLaughed)} rozbawiło Was oboje do łez`,
    });
  }
  if (bLikedA > 0) {
    reasons.push({
      kind: 'liked-your-memes',
      text: `Polubił(a) ${bLikedA} ${pluralMemes(bLikedA)} z Twojej galerii`,
    });
  }

  return { score, reasons };
}

export function pluralMemes(n: number): string {
  if (n === 1) return 'mem';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'memy';
  return 'memów';
}
