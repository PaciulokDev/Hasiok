# Hasiok 😂💘

Aplikacja randkowa (web + mobile), która łączy ludzi na podstawie **memów i poczucia humoru**.
Nie ma tu zdjęć osób: zamiast nich każdy profil ma **galerię ulubionych memów** oraz opis.

Uczymy się programować 🙂

## Jak to działa

1. **Galeria memów** zamiast zdjęć. Każdy dodaje do 12 memów i opisuje je kategoriami humoru
   (absurd, czarny humor, suchary, IT, zwierzaki…).
2. **Oceniaj memy**: przeglądasz memy z galerii innych osób i reagujesz 😂 / 🙂 / 😐.
   W ten sposób aplikacja uczy się, co Cię śmieszy.
3. **Odkrywaj**: widzisz profile posortowane według **zgodności humoru (0–100%)** i powód dopasowania,
   np. „3 memy rozbawiły Was oboje do łez”. Dajesz „😂 Śmieszne!” albo „😐 Nie mój humor”.
4. **Para**: gdy dwie osoby polubią się nawzajem, powstaje para i można pisać na czacie,
   także wysyłając sobie memy.
5. **Bezpieczeństwo**: zgłaszanie profili (np. zdjęcia osób zamiast memów), blokowanie,
   rozłączanie par, usuwanie konta. Tylko osoby pełnoletnie.

### Algorytm dopasowania

Kod jest w [`shared/src/matching.ts`](shared/src/matching.ts). Wynik łączy trzy rzeczy:

| Składnik | Co mierzy |
|---|---|
| Podobieństwo gustu | Cosinus podobieństwa „wektorów humoru”, zbudowanych z kategorii w profilu, kategorii własnych memów i reakcji na cudze memy |
| Zgodność reakcji | Jak podobnie obie osoby oceniły **te same** memy |
| Reakcje na siebie nawzajem | Jak każda z osób ocenia memy z galerii drugiej |

Im więcej wspólnie ocenionych memów, tym większą wagę mają dwa ostatnie składniki.

## Struktura projektu

```
shared/   wspólny kod TypeScript: typy, kategorie humoru, algorytm dopasowania, klient API
server/   API: Node.js + Express + SQLite (wbudowane w Node, bez instalowania bazy)
web/      aplikacja webowa: React + Vite
mobile/   aplikacja mobilna: React Native + Expo (Android / iOS)
```

To jedno repozytorium z [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces):
aplikacja webowa, mobilna i serwer korzystają z tego samego kodu w `shared/`.

## Uruchomienie

Wymagany **Node.js 22.13+** (serwer używa wbudowanego modułu `node:sqlite`).

```bash
npm install          # instaluje zależności wszystkich części
npm run seed         # (opcjonalnie) 8 przykładowych profili z memami
npm run dev:server   # API na http://localhost:4000
```

W drugim terminalu:

```bash
npm run dev:web      # aplikacja webowa na http://localhost:5173
```

Konta demo po `npm run seed`, np. `kasia404@demo.hasiok.pl`, `tomekexe@demo.hasiok.pl`
albo `olazkotem@demo.hasiok.pl`. Hasło do każdego: `hasiok123`.

### Aplikacja mobilna

1. Zainstaluj na telefonie **Expo Go** (Google Play / App Store).
2. Telefon i komputer muszą być w tej samej sieci Wi-Fi, a serwer musi działać (`npm run dev:server`).
3. Uruchom:

   ```bash
   npm run dev:mobile
   ```

4. Zeskanuj kod QR z terminala aparatem (iOS) albo w Expo Go (Android).

Aplikacja sama znajdzie serwer na komputerze, na którym działa `expo start` (port 4000).
Jeśli serwer jest gdzie indziej, utwórz `mobile/.env.local` z wpisem:

```
EXPO_PUBLIC_API_URL=http://adres-serwera:4000
```

## Przydatne komendy

```bash
npm test             # testy algorytmu dopasowania i API
npm run typecheck    # sprawdzenie typów TypeScript we wszystkich częściach
npm run build -w web # produkcyjna wersja aplikacji webowej (web/dist)
```

Po zbudowaniu `web/dist` serwer (`npm start -w server`) serwuje też aplikację webową pod
http://localhost:4000. W produkcji ustaw `NODE_ENV=production` i `JWT_SECRET` (z `NODE_ENV=production` serwer bez sekretu nie wystartuje),
a opcjonalnie `PORT`, `DB_FILE` i `UPLOAD_DIR`.

## API (skrót)

| Metoda i adres | Opis |
|---|---|
| `POST /api/auth/register`, `POST /api/auth/login` | Rejestracja i logowanie (zwraca token JWT) |
| `GET/PUT/DELETE /api/me` | Mój profil |
| `POST /api/memes`, `DELETE /api/memes/:id` | Dodanie mema (multipart: `image`, `caption`, `tags`) / usunięcie |
| `GET /api/feed`, `POST /api/memes/:id/reaction` | Memy do oceny / reakcja `lol`, `ok`, `meh` |
| `GET /api/discover`, `POST /api/swipes` | Kandydaci ze zgodnością humoru / polub albo pomiń |
| `GET /api/matches`, `DELETE /api/matches/:id` | Pary / rozłączenie |
| `GET/POST /api/matches/:id/messages` | Czat (tekst albo `memeId`) |
| `GET /api/users/:id`, `POST /api/users/:id/report`, `POST /api/users/:id/block` | Profil, zgłoszenie, blokada |

## Pomysły na dalszy rozwój

- Automatyczne wykrywanie twarzy na przesyłanych obrazkach, żeby pilnować zasady „tylko memy”.
- Panel moderacji zgłoszeń.
- Czat w czasie rzeczywistym (WebSocket) i powiadomienia push.
- Limit prób logowania, reset hasła, weryfikacja e-maila.
- Przechowywanie obrazków w chmurze (np. S3) i baza PostgreSQL przy większej liczbie użytkowników.
- „Meme duel”: dwie osoby oceniają te same memy na żywo.
