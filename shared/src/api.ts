import type { ReactionId } from './humor';
import type {
  AuthResponse,
  Candidate,
  FeedMeme,
  MatchSummary,
  Meme,
  Message,
  MyProfile,
  ProfileUpdate,
  PublicProfile,
  RegisterInput,
  SwipeResult,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export interface ApiClientOptions {
  /** Np. "" (ten sam adres w przeglądarce) albo "http://192.168.0.10:4000" w aplikacji mobilnej. */
  baseUrl: string;
  getToken: () => string | null | Promise<string | null>;
  /** Wywoływane, gdy serwer odrzuci token (np. wygasł) — aplikacja powinna wylogować. */
  onUnauthorized?: () => void;
}

/** Klient REST API współdzielony przez aplikację webową i mobilną. */
export function createApiClient(options: ApiClientOptions) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await options.getToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload: BodyInit | undefined;
    if (body instanceof FormData) {
      payload = body;
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const res = await fetch(`${options.baseUrl}/api${path}`, { method, headers, body: payload });
    if (res.status === 401 && token) options.onUnauthorized?.();
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new ApiError(data?.error ?? `Błąd serwera (${res.status})`, res.status);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    /** Zamienia względny adres obrazka z serwera na pełny URL. */
    imageUrl: (path: string) => (path.startsWith('http') ? path : `${options.baseUrl}${path}`),

    register: (input: RegisterInput) => request<AuthResponse>('POST', '/auth/register', input),
    login: (email: string, password: string) =>
      request<AuthResponse>('POST', '/auth/login', { email, password }),

    me: () => request<MyProfile>('GET', '/me'),
    updateMe: (update: ProfileUpdate) => request<MyProfile>('PUT', '/me', update),
    deleteMe: () => request<void>('DELETE', '/me'),

    /** FormData z polami: image (plik), caption, tags (JSON z listą kategorii). */
    uploadMeme: (form: FormData) => request<Meme>('POST', '/memes', form),
    deleteMeme: (id: number) => request<void>('DELETE', `/memes/${id}`),

    feed: () => request<FeedMeme[]>('GET', '/feed'),
    react: (memeId: number, reaction: ReactionId) =>
      request<void>('POST', `/memes/${memeId}/reaction`, { reaction }),

    discover: () => request<Candidate[]>('GET', '/discover'),
    swipe: (userId: number, liked: boolean) =>
      request<SwipeResult>('POST', '/swipes', { userId, liked }),

    matches: () => request<MatchSummary[]>('GET', '/matches'),
    messages: (matchId: number, afterId = 0) =>
      request<Message[]>('GET', `/matches/${matchId}/messages?after=${afterId}`),
    sendMessage: (matchId: number, content: { body?: string; memeId?: number }) =>
      request<Message>('POST', `/matches/${matchId}/messages`, content),
    unmatch: (matchId: number) => request<void>('DELETE', `/matches/${matchId}`),

    profile: (userId: number) => request<PublicProfile>('GET', `/users/${userId}`),
    report: (userId: number, reason: string) =>
      request<void>('POST', `/users/${userId}/report`, { reason }),
    block: (userId: number) => request<void>('POST', `/users/${userId}/block`),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
