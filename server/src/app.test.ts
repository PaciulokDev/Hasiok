import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApiClient, type ApiClient, type Gender, type HumorTag } from '@hasiok/shared';
import { createApp } from './app';
import { openDb } from './db';
import { detectImageType } from './routes/memes';

// Najmniejszy poprawny PNG (1x1 piksel).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

let server: Server;
let baseUrl: string;
let tmp: string;

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hasiok-'));
  const app = createApp({ db: openDb(':memory:'), uploadDir: tmp, jwtSecret: 'test' });
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

async function newUser(name: string, gender: Gender, lookingFor: Gender[], humorTags: HumorTag[]) {
  let token: string | null = null;
  const api = createApiClient({ baseUrl, getToken: () => token });
  const res = await api.register({
    email: `${name}@test.pl`,
    password: 'haslo1234',
    nickname: name,
    birthYear: new Date().getFullYear() - 25,
    gender,
    lookingFor,
  });
  token = res.token;
  await api.updateMe({ humorTags, bio: `Cześć, tu ${name}` });
  return { api, id: res.user.id };
}

async function uploadMeme(api: ApiClient, tags: HumorTag[]) {
  const form = new FormData();
  form.append('image', new Blob([PNG], { type: 'image/png' }), 'mem.png');
  form.append('caption', 'Kiedy testy przechodzą za pierwszym razem');
  form.append('tags', JSON.stringify(tags));
  return api.uploadMeme(form);
}

test('detectImageType recognizes images and rejects other files', () => {
  assert.equal(detectImageType(PNG), 'png');
  assert.equal(detectImageType(Buffer.from('<svg><script>alert(1)</script></svg>')), null);
});

test('full flow: register, memes, feed, discover, match, chat, block', async () => {
  const ala = await newUser('ala', 'woman', ['man'], ['it', 'puns']);
  const bartek = await newUser('bartek', 'man', ['woman'], ['it', 'gaming']);
  const celina = await newUser('celina', 'woman', ['woman'], ['it']);

  // Rejestracja i logowanie
  await assert.rejects(ala.api.login('ala@test.pl', 'zle-haslo'), /Zły e-mail lub hasło/);
  const login = await ala.api.login('ala@test.pl', 'haslo1234');
  assert.equal(login.user.nickname, 'ala');

  // Galeria memów
  const alaMeme = await uploadMeme(ala.api, ['it']);
  assert.match(alaMeme.imageUrl, /^\/uploads\/.+\.png$/);
  const image = await fetch(baseUrl + alaMeme.imageUrl);
  assert.equal(image.status, 200);
  await uploadMeme(bartek.api, ['gaming']);
  await uploadMeme(celina.api, ['it']);

  const badForm = new FormData();
  badForm.append('image', new Blob(['nie obrazek']), 'x.png');
  badForm.append('tags', '["it"]');
  await assert.rejects(ala.api.uploadMeme(badForm), /JPG, PNG, GIF i WEBP/);

  // Kalibracja humoru: Bartek ocenia memy innych
  const feed = await bartek.api.feed();
  assert.equal(feed.length, 2);
  assert.ok(feed.every((m) => m.ownerId !== bartek.id));
  await bartek.api.react(alaMeme.id, 'lol');
  assert.equal((await bartek.api.feed()).length, 1);
  assert.equal((await bartek.api.me()).reactionsCount, 1);

  // Odkrywanie: preferencje działają w obie strony (Celina szuka kobiet, więc Bartek jej nie widzi)
  const forAla = await ala.api.discover();
  assert.deepEqual(forAla.map((c) => c.profile.nickname), ['bartek']);
  assert.ok(forAla[0].score > 0);
  assert.equal(forAla[0].profile.memes.length, 1);
  assert.deepEqual((await bartek.api.discover()).map((c) => c.profile.nickname), ['ala']);
  const alaSeenByBartek = (await bartek.api.discover())[0];
  assert.ok(alaSeenByBartek.reasons.some((r) => r.kind === 'shared-tags'));

  // Para powstaje dopiero przy wzajemnym polubieniu
  assert.deepEqual(await ala.api.swipe(bartek.id, true), { matched: false, matchId: null });
  assert.equal((await ala.api.discover()).length, 0);
  const swipe = await bartek.api.swipe(ala.id, true);
  assert.equal(swipe.matched, true);

  // Czat: tekst i mem
  const matchId = swipe.matchId!;
  await ala.api.sendMessage(matchId, { body: 'Hej! Też płaczesz przy memach o JavaScripcie?' });
  await bartek.api.sendMessage(matchId, { memeId: alaMeme.id });
  const messages = await ala.api.messages(matchId);
  assert.equal(messages.length, 2);
  assert.equal(messages[1].meme?.id, alaMeme.id);
  assert.equal((await ala.api.messages(matchId, messages[0].id)).length, 1);
  await assert.rejects(celina.api.messages(matchId), /Nie ma takiej pary/);
  await assert.rejects(ala.api.sendMessage(matchId, { body: '   ' }), /pusta/);

  const matches = await bartek.api.matches();
  assert.equal(matches.length, 1);
  assert.equal(matches[0].other.nickname, 'ala');
  assert.equal(matches[0].lastMessage?.meme?.id, alaMeme.id);

  // Blokada usuwa parę i ukrywa profil
  await ala.api.report(bartek.id, 'Wrzuca swoje selfie zamiast memów');
  await ala.api.block(bartek.id);
  assert.equal((await bartek.api.matches()).length, 0);
  await assert.rejects(bartek.api.profile(ala.id), /Nie ma takiego użytkownika/);
  assert.ok((await bartek.api.feed()).every((m) => m.ownerId !== ala.id));
});

test('validation: adults only, unique e-mail, auth required', async () => {
  const api = createApiClient({ baseUrl, getToken: () => null });
  const base = { password: 'haslo1234', nickname: 'młody', gender: 'man' as const, lookingFor: ['woman' as const] };
  await assert.rejects(
    api.register({ ...base, email: 'mlody@test.pl', birthYear: new Date().getFullYear() - 16 }),
    /co najmniej 18 lat/,
  );
  await api.register({ ...base, email: 'dup@test.pl', birthYear: 1990 });
  await assert.rejects(api.register({ ...base, email: 'DUP@test.pl', birthYear: 1990 }), /już istnieje/);
  await assert.rejects(api.discover(), (err: any) => err.status === 401);
});
