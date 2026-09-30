import type { HumorTag, ReactionId } from './humor';

export type Gender = 'woman' | 'man' | 'nonbinary';

export const GENDERS: { id: Gender; label: string }[] = [
  { id: 'woman', label: 'Kobieta' },
  { id: 'man', label: 'Mężczyzna' },
  { id: 'nonbinary', label: 'Osoba niebinarna' },
];

export interface Meme {
  id: number;
  ownerId: number;
  imageUrl: string;
  caption: string;
  tags: HumorTag[];
  createdAt: string;
}

/** Publiczna część profilu — bez zdjęć osoby, tylko memy i opis. */
export interface PublicProfile {
  id: number;
  nickname: string;
  age: number;
  city: string;
  bio: string;
  gender: Gender;
  humorTags: HumorTag[];
  memes: Meme[];
}

export interface MyProfile extends PublicProfile {
  email: string;
  birthYear: number;
  lookingFor: Gender[];
  ageMin: number;
  ageMax: number;
  /** Ile memów z kalibracji ocenił użytkownik — im więcej, tym trafniejsze dopasowania. */
  reactionsCount: number;
}

export interface ProfileUpdate {
  nickname?: string;
  birthYear?: number;
  city?: string;
  bio?: string;
  gender?: Gender;
  lookingFor?: Gender[];
  ageMin?: number;
  ageMax?: number;
  humorTags?: HumorTag[];
}

export interface RegisterInput {
  email: string;
  password: string;
  nickname: string;
  birthYear: number;
  gender: Gender;
  lookingFor: Gender[];
}

export interface AuthResponse {
  token: string;
  user: MyProfile;
}

export interface CompatibilityReason {
  kind: 'shared-tags' | 'same-memes' | 'liked-your-memes';
  text: string;
}

export interface Candidate {
  profile: PublicProfile;
  score: number;
  reasons: CompatibilityReason[];
}

export interface FeedMeme extends Meme {
  ownerNickname: string;
  myReaction: ReactionId | null;
}

export interface SwipeResult {
  matched: boolean;
  matchId: number | null;
}

export interface Message {
  id: number;
  matchId: number;
  senderId: number;
  body: string;
  meme: Meme | null;
  createdAt: string;
}

export interface MatchSummary {
  id: number;
  createdAt: string;
  score: number;
  other: PublicProfile;
  lastMessage: Message | null;
}
