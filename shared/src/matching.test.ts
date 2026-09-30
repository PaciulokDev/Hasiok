import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compatibility, cosineSimilarity, pluralMemes, type HumorSignals } from './matching';

function user(partial: Partial<HumorSignals> & { userId: number }): HumorSignals {
  return { declaredTags: [], ownMemes: [], reactions: {}, ...partial };
}

test('cosineSimilarity handles identical, orthogonal and empty vectors', () => {
  assert.equal(cosineSimilarity([1, 2], [1, 2]).toFixed(5), '1.00000');
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
});

test('people with the same humor score higher than people with opposite humor', () => {
  const nerd = user({ userId: 1, declaredTags: ['it', 'puns', 'gaming'] });
  const nerd2 = user({ userId: 2, declaredTags: ['it', 'gaming', 'absurd'] });
  const dark = user({ userId: 3, declaredTags: ['dark', 'cringe'] });

  const similar = compatibility(nerd, nerd2);
  const different = compatibility(nerd, dark);
  assert.ok(similar.score > different.score, `${similar.score} should be > ${different.score}`);
  assert.equal(different.score, 0);
  assert.ok(similar.reasons.some((r) => r.kind === 'shared-tags'));
});

test('agreeing on the same memes raises the score, disagreeing lowers it', () => {
  const base = { declaredTags: ['absurd' as const] };
  const memes = { 10: { value: 2, tags: ['absurd' as const] }, 11: { value: 2, tags: ['surreal' as const] } };
  const a = user({ userId: 1, ...base, reactions: memes });
  const agrees = user({ userId: 2, ...base, reactions: memes });
  const disagrees = user({
    userId: 3,
    ...base,
    reactions: { 10: { value: -1, tags: ['absurd'] }, 11: { value: -1, tags: ['surreal'] } },
  });

  const good = compatibility(a, agrees);
  const bad = compatibility(a, disagrees);
  assert.ok(good.score > bad.score);
  assert.ok(good.reasons.some((r) => r.kind === 'same-memes'));
});

test('liking the other person memes is reported as a reason', () => {
  const a = user({ userId: 1, declaredTags: ['animals'], ownMemes: [{ id: 5, tags: ['animals'] }] });
  const b = user({ userId: 2, declaredTags: ['animals'], reactions: { 5: { value: 2, tags: ['animals'] } } });
  const result = compatibility(a, b);
  assert.ok(result.reasons.some((r) => r.kind === 'liked-your-memes'));
  assert.ok(result.score >= 90);
});

test('score is symmetric', () => {
  const a = user({ userId: 1, declaredTags: ['it', 'dark'], reactions: { 1: { value: 2, tags: ['it'] } } });
  const b = user({ userId: 2, declaredTags: ['it'], reactions: { 1: { value: 1, tags: ['it'] } } });
  assert.equal(compatibility(a, b).score, compatibility(b, a).score);
});

test('Polish plural forms', () => {
  assert.equal(pluralMemes(1), 'mem');
  assert.equal(pluralMemes(3), 'memy');
  assert.equal(pluralMemes(5), 'memów');
  assert.equal(pluralMemes(12), 'memów');
  assert.equal(pluralMemes(22), 'memy');
});
