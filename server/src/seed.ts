/**
 * Wypełnia bazę przykładowymi profilami i memami, żeby było co przeglądać.
 * Uruchom: npm run seed   (hasło do każdego konta demo: hasiok123)
 *
 * Memy demo to proste obrazki SVG z tekstem wygenerowane w kodzie — bez cudzych zdjęć
 * i bez problemów z prawami autorskimi.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Gender, HumorTag, ReactionId } from '@hasiok/shared';
import { hashPassword } from './auth';
import { config } from './config';
import { all, openDb, run, transaction } from './db';

interface DemoMeme {
  emoji: string;
  top: string;
  bottom: string;
  tags: HumorTag[];
}

interface DemoUser {
  nickname: string;
  age: number;
  city: string;
  gender: Gender;
  lookingFor: Gender[];
  humorTags: HumorTag[];
  bio: string;
  memes: DemoMeme[];
}

const COLORS = ['#ff6b6b', '#4ecdc4', '#ffd166', '#6c5ce7', '#06d6a0', '#118ab2', '#ef476f', '#f78c6b'];

const USERS: DemoUser[] = [
  {
    nickname: 'Kasia_404',
    age: 27,
    city: 'Kraków',
    gender: 'woman',
    lookingFor: ['man', 'nonbinary'],
    humorTags: ['it', 'puns', 'sarcasm'],
    bio: 'Frontendówka. Centruję divy zawodowo, życie prywatne wciąż się rozjeżdża. Szukam kogoś, kto zrozumie żart o CSS.',
    memes: [
      { emoji: '💻', top: 'Działa na moim komputerze', bottom: 'To wyślemy klientowi Twój komputer', tags: ['it', 'work'] },
      { emoji: '🐛', top: 'Naprawiłam jeden bug', bottom: 'Pojawiło się siedem nowych', tags: ['it', 'sarcasm'] },
      { emoji: '🥖', top: 'Jak nazywa się pieczywo programisty?', bottom: 'Bajt-gietka', tags: ['puns', 'it'] },
    ],
  },
  {
    nickname: 'Tomek.exe',
    age: 29,
    city: 'Wrocław',
    gender: 'man',
    lookingFor: ['woman'],
    humorTags: ['it', 'gaming', 'absurd'],
    bio: 'Backend, planszówki i za dużo kawy. Mój typ: osoba, która śmieje się z własnych żartów głośniej niż ja.',
    memes: [
      { emoji: '☕', top: 'Kawa nr 1: produktywność', bottom: 'Kawa nr 5: widzę dźwięki', tags: ['work', 'absurd'] },
      { emoji: '🎮', top: 'Jeszcze jedna runda', bottom: 'Ptaki za oknem zaczynają śpiewać', tags: ['gaming'] },
      { emoji: '🗂️', top: 'Nazwa pliku: final_final_v2', bottom: 'Kolejna wersja: final_naprawde_final', tags: ['it', 'work'] },
    ],
  },
  {
    nickname: 'Ola_z_kotem',
    age: 24,
    city: 'Warszawa',
    gender: 'woman',
    lookingFor: ['man', 'woman'],
    humorTags: ['animals', 'wholesome', 'absurd'],
    bio: 'Mój kot ma więcej fanów niż ja. Szukam kogoś, kto zaakceptuje, że on zawsze będzie numerem jeden.',
    memes: [
      { emoji: '🐈', top: 'Kot o 3:00 w nocy', bottom: 'Czas na wyścigi po mieszkaniu', tags: ['animals', 'absurd'] },
      { emoji: '🐕', top: 'Pies, gdy wracasz po 5 minutach', bottom: 'Myślałem, że już nie wrócisz!!!', tags: ['animals', 'wholesome'] },
      { emoji: '🦆', top: 'Kaczka nie ma zmartwień', bottom: 'Bądź jak kaczka', tags: ['absurd', 'wholesome'] },
    ],
  },
  {
    nickname: 'Mroczny_Marek',
    age: 31,
    city: 'Gdańsk',
    gender: 'man',
    lookingFor: ['woman'],
    humorTags: ['dark', 'sarcasm', 'work'],
    bio: 'Uśmiecham się tylko w poniedziałki, bo wtedy nikt się tego nie spodziewa. Lubię czarny humor i czarną kawę.',
    memes: [
      { emoji: '📊', top: 'Spotkanie, które mogło być mailem', bottom: 'Trwa już trzecią godzinę', tags: ['work', 'sarcasm'] },
      { emoji: '🖤', top: 'Mój plan na przyszłość', bottom: 'Przeżyć do piątku', tags: ['dark', 'work'] },
      { emoji: '🙃', top: 'Wszystko w porządku', bottom: '(nic nie jest w porządku)', tags: ['sarcasm', 'dark'] },
    ],
  },
  {
    nickname: 'Zuza_Pierożek',
    age: 26,
    city: 'Poznań',
    gender: 'woman',
    lookingFor: ['man'],
    humorTags: ['polish', 'nostalgia', 'wholesome'],
    bio: 'Wychowana na Kapitanie Bombie i pierogach babci. Pierwsza randka? Bar mleczny, bez dyskusji.',
    memes: [
      { emoji: '🥟', top: 'Babcia: zjesz jeszcze jednego?', bottom: 'Pierogów na talerzu: 47', tags: ['polish', 'wholesome'] },
      { emoji: '📼', top: 'Dzieci dziś nie wiedzą', bottom: 'Po co był ołówek do kasety', tags: ['nostalgia'] },
      { emoji: '🚃', top: 'Pociąg opóźniony o 5 minut', bottom: 'Wystarczy poczekać 240 minut', tags: ['polish', 'sarcasm'] },
    ],
  },
  {
    nickname: 'Kuba_Surrealista',
    age: 28,
    city: 'Łódź',
    gender: 'man',
    lookingFor: ['woman', 'nonbinary'],
    humorTags: ['surreal', 'absurd', 'animals'],
    bio: 'Wierzę, że gołębie to drony rządowe, a ogórek to ambitna cukinia. Szukam kogoś równie odklejonego.',
    memes: [
      { emoji: '🥒', top: 'Ogórek', bottom: 'Po prostu ogórek', tags: ['surreal', 'absurd'] },
      { emoji: '🐦', top: 'Gołąb patrzy mi w oczy', bottom: 'On wie', tags: ['surreal', 'animals'] },
      { emoji: '🌀', top: 'Ja: idę spać wcześnie', bottom: 'Mózg: a pamiętasz rok 2011?', tags: ['absurd', 'cringe'] },
    ],
  },
  {
    nickname: 'Alex_Popcorn',
    age: 25,
    city: 'Katowice',
    gender: 'nonbinary',
    lookingFor: ['woman', 'man', 'nonbinary'],
    humorTags: ['popculture', 'relationships', 'cringe'],
    bio: 'Znam wszystkie cytaty z „Seksmisji”. Obejrzę z Tobą każdy serial, nawet ten z dziewięcioma sezonami za dużo.',
    memes: [
      { emoji: '🍿', top: 'Jeszcze jeden odcinek', bottom: 'Sezon 4, godzina 4:00', tags: ['popculture'] },
      { emoji: '💘', top: 'Napisałem „hej”', bottom: 'Teraz czekam i analizuję jej status', tags: ['relationships', 'cringe'] },
      { emoji: '😬', top: 'Kelner: smacznego', bottom: 'Ja: nawzajem', tags: ['cringe', 'relationships'] },
    ],
  },
  {
    nickname: 'Magda_Studentka',
    age: 22,
    city: 'Lublin',
    gender: 'woman',
    lookingFor: ['man', 'woman'],
    humorTags: ['school', 'sarcasm', 'gaming'],
    bio: 'Studiuję i czekam na sesję jak na wyrok. W wolnych chwilach Minecraft i memy o wykładowcach.',
    memes: [
      { emoji: '🎓', top: 'Ja przed sesją: mam dużo czasu', bottom: 'Ja noc przed egzaminem: 😱', tags: ['school'] },
      { emoji: '📚', top: 'Prowadzący: to będzie na egzaminie', bottom: 'Cała sala nagle się budzi', tags: ['school', 'sarcasm'] },
      { emoji: '⛏️', top: 'Zadania na jutro', bottom: 'Kopanie diamentów w Minecrafcie', tags: ['gaming', 'school'] },
    ],
  },
];

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}

function wrap(text: string, maxChars = 22): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if ((line + ' ' + word).trim().length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines;
}

function memeSvg(meme: DemoMeme, color: string): string {
  const textBlock = (text: string, startY: number) =>
    wrap(text.toUpperCase())
      .map((line, i) => `<text x="300" y="${startY + i * 44}">${escapeXml(line)}</text>`)
      .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
<rect width="600" height="600" fill="${color}"/>
<text x="300" y="360" font-size="200" text-anchor="middle">${meme.emoji}</text>
<g font-family="Impact, Arial Black, sans-serif" font-size="38" font-weight="bold" fill="#fff" stroke="#000" stroke-width="2" text-anchor="middle">
${textBlock(meme.top, 70)}
${textBlock(meme.bottom, 490)}
</g>
</svg>`;
}

const REACTIONS_BY_OVERLAP: ReactionId[] = ['meh', 'ok', 'lol'];

const db = openDb(config.dbFile);
fs.mkdirSync(config.uploadDir, { recursive: true });
const passwordHash = hashPassword('hasiok123');
const year = new Date().getFullYear();

transaction(db, () => {
  USERS.forEach((u, userIndex) => {
    const email = `${u.nickname.toLowerCase().replace(/[^a-z0-9]/g, '')}@demo.hasiok.pl`;
    if (all(db, 'SELECT 1 FROM users WHERE email = ?', email).length) return;
    const { id } = run(
      db,
      `INSERT INTO users (email, password_hash, nickname, birth_year, city, bio, gender, looking_for, humor_tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      email,
      passwordHash,
      u.nickname,
      year - u.age,
      u.city,
      u.bio,
      u.gender,
      JSON.stringify(u.lookingFor),
      JSON.stringify(u.humorTags),
    );
    u.memes.forEach((meme, i) => {
      const fileName = `demo-${userIndex}-${i}.svg`;
      fs.writeFileSync(path.join(config.uploadDir, fileName), memeSvg(meme, COLORS[(userIndex + i) % COLORS.length]));
      run(db, 'INSERT INTO memes (owner_id, file_name, caption, tags) VALUES (?, ?, ?, ?)', id, fileName, meme.top, JSON.stringify(meme.tags));
    });
    console.log(`+ ${u.nickname} (${email})`);
  });

  // Demo-użytkownicy oceniają nawzajem swoje memy: im więcej wspólnych kategorii, tym lepsza reakcja.
  const users = all(db, "SELECT id, humor_tags FROM users WHERE email LIKE '%@demo.hasiok.pl'");
  const memes = all(db, 'SELECT id, owner_id, tags FROM memes');
  for (const user of users) {
    const liked: string[] = JSON.parse(user.humor_tags);
    for (const meme of memes) {
      if (meme.owner_id === user.id) continue;
      const overlap = (JSON.parse(meme.tags) as string[]).filter((t) => liked.includes(t)).length;
      run(
        db,
        'INSERT OR IGNORE INTO reactions (user_id, meme_id, reaction) VALUES (?, ?, ?)',
        user.id,
        meme.id,
        REACTIONS_BY_OVERLAP[Math.min(overlap, 2)],
      );
    }
  }
});

console.log(`\nGotowe! Zaloguj się np. jako kasia404@demo.hasiok.pl / hasiok123`);
