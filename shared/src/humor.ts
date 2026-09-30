/**
 * Kategorie humoru. Każdy mem i każdy profil jest opisany kilkoma z nich,
 * a na ich podstawie liczymy, czy dwie osoby śmieją się z tego samego.
 */
export const HUMOR_TAGS = [
  { id: 'absurd', label: 'Absurd', emoji: '🦆' },
  { id: 'dark', label: 'Czarny humor', emoji: '🖤' },
  { id: 'wholesome', label: 'Wholesome', emoji: '🥹' },
  { id: 'puns', label: 'Suchary', emoji: '🥖' },
  { id: 'animals', label: 'Zwierzaki', emoji: '🐈' },
  { id: 'gaming', label: 'Gaming', emoji: '🎮' },
  { id: 'it', label: 'IT i programowanie', emoji: '💻' },
  { id: 'school', label: 'Szkoła i studia', emoji: '🎓' },
  { id: 'work', label: 'Korpo i praca', emoji: '📊' },
  { id: 'polish', label: 'Polskie realia', emoji: '🥟' },
  { id: 'nostalgia', label: 'Nostalgia', emoji: '📼' },
  { id: 'popculture', label: 'Filmy i seriale', emoji: '🍿' },
  { id: 'sarcasm', label: 'Sarkazm', emoji: '🙃' },
  { id: 'cringe', label: 'Cringe', emoji: '😬' },
  { id: 'surreal', label: 'Surrealizm', emoji: '🌀' },
  { id: 'relationships', label: 'Związki i randki', emoji: '💘' },
] as const;

export type HumorTag = (typeof HUMOR_TAGS)[number]['id'];

export const HUMOR_TAG_IDS: readonly HumorTag[] = HUMOR_TAGS.map((t) => t.id);

export function isHumorTag(value: unknown): value is HumorTag {
  return typeof value === 'string' && (HUMOR_TAG_IDS as readonly string[]).includes(value);
}

export function humorTagLabel(id: HumorTag): string {
  const tag = HUMOR_TAGS.find((t) => t.id === id);
  return tag ? `${tag.emoji} ${tag.label}` : id;
}

/** Reakcje na mema. Wartość liczbowa jest używana w algorytmie dopasowania. */
export const REACTIONS = [
  { id: 'lol', label: 'Płaczę ze śmiechu', emoji: '😂', value: 2 },
  { id: 'ok', label: 'Niezłe', emoji: '🙂', value: 1 },
  { id: 'meh', label: 'Nie moje', emoji: '😐', value: -1 },
] as const;

export type ReactionId = (typeof REACTIONS)[number]['id'];

export function reactionValue(id: ReactionId): number {
  return REACTIONS.find((r) => r.id === id)?.value ?? 0;
}

export function isReactionId(value: unknown): value is ReactionId {
  return typeof value === 'string' && REACTIONS.some((r) => r.id === value);
}

export const LIMITS = {
  minAge: 18,
  maxMemesPerProfile: 12,
  maxTagsPerMeme: 4,
  maxHumorTags: 6,
  maxBioLength: 500,
  maxCaptionLength: 140,
  maxMessageLength: 1000,
  maxUploadBytes: 5 * 1024 * 1024,
} as const;
