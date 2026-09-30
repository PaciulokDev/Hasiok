import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createApiClient } from '@hasiok/shared';

/**
 * Adres serwera API:
 *  1. zmienna EXPO_PUBLIC_API_URL (np. w pliku mobile/.env), albo
 *  2. w trybie deweloperskim — komputer, na którym działa `expo start`, port 4000.
 */
function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:4000`;
}

const TOKEN_KEY = 'hasiok.token';

/** Token trzymamy w bezpiecznym magazynie telefonu (w przeglądarce — w localStorage). */
export const tokenStore = {
  async get(): Promise<string | null> {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(token: string | null): Promise<void> {
    if (Platform.OS === 'web') {
      if (token) globalThis.localStorage?.setItem(TOKEN_KEY, token);
      else globalThis.localStorage?.removeItem(TOKEN_KEY);
      return;
    }
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};

let currentToken: string | null = null;
let unauthorizedHandler = () => {};

export function setSessionToken(token: string | null) {
  currentToken = token;
}

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export const api = createApiClient({
  baseUrl: resolveBaseUrl(),
  getToken: () => currentToken,
  onUnauthorized: () => unauthorizedHandler(),
});
