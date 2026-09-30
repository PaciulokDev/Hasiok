import { useState, type FormEvent } from 'react';
import { GENDERS, LIMITS, type Gender, type HumorTag, type MyProfile } from '@hasiok/shared';
import { api, useAuth } from '../auth';
import { MemeGrid } from '../components/MemeGrid';
import { TagPicker } from '../components/TagPicker';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  if (!user) return null;

  return (
    <div className="stack">
      <GallerySection user={user} />
      <ProfileForm user={user} />
      <div className="card">
        <p className="muted small">Zalogowano jako {user.email}</p>
        <div className="actions">
          <button onClick={signOut}>Wyloguj</button>
          <button
            className="danger"
            onClick={async () => {
              if (!window.confirm('Na pewno usunąć konto razem z memami i rozmowami?')) return;
              await api.deleteMe();
              signOut();
            }}
          >
            Usuń konto
          </button>
        </div>
      </div>
    </div>
  );
}

function GallerySection({ user }: { user: MyProfile }) {
  const { refresh } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<HumorTag[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const full = user.memes.length >= LIMITS.maxMemesPerProfile;

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) return setError('Wybierz obrazek');
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('image', file);
    form.append('caption', caption);
    form.append('tags', JSON.stringify(tags));
    try {
      await api.uploadMeme(form);
      await refresh();
      setFile(null);
      setCaption('');
      setTags([]);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>
        🖼️ Moja galeria memów ({user.memes.length}/{LIMITS.maxMemesPerProfile})
      </h2>
      <p className="muted small">To Twoja „twarz” w aplikacji. Wrzucaj memy, które najlepiej oddają Twój humor.</p>
      <MemeGrid
        memes={user.memes}
        action={{
          label: 'Usuń',
          onClick: async (meme) => {
            if (!window.confirm('Usunąć mema z galerii?')) return;
            await api.deleteMeme(meme.id);
            await refresh();
          },
        }}
      />
      {!full && (
        <form onSubmit={upload} className="upload">
          <div className="banner">
            📵 Bez zdjęć siebie ani innych osób — tylko memy! Takie profile są zgłaszane i usuwane.
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Podpis (opcjonalnie)"
            maxLength={LIMITS.maxCaptionLength}
          />
          <p className="small muted">Kategorie (max {LIMITS.maxTagsPerMeme}):</p>
          <TagPicker value={tags} onChange={setTags} max={LIMITS.maxTagsPerMeme} />
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={busy || !file || tags.length === 0}>
            Dodaj mema
          </button>
        </form>
      )}
    </div>
  );
}

function ProfileForm({ user: me }: { user: MyProfile }) {
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    nickname: me.nickname,
    birthYear: me.birthYear,
    city: me.city,
    bio: me.bio,
    gender: me.gender,
    lookingFor: me.lookingFor,
    ageMin: me.ageMin,
    ageMax: me.ageMax,
    humorTags: me.humorTags,
  });
  const [status, setStatus] = useState('');
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setStatus('');
    try {
      setUser(await api.updateMe(form));
      setStatus('Zapisano ✅');
    } catch (err) {
      setStatus((err as Error).message);
    }
  }

  const toggleLookingFor = (g: Gender) =>
    set('lookingFor', form.lookingFor.includes(g) ? form.lookingFor.filter((x) => x !== g) : [...form.lookingFor, g]);

  return (
    <form className="card" onSubmit={save}>
      <h2>✏️ O mnie</h2>
      <label>
        Nick
        <input value={form.nickname} onChange={(e) => set('nickname', e.target.value)} maxLength={30} />
      </label>
      <div className="row">
        <label>
          Rok urodzenia
          <input type="number" value={form.birthYear} onChange={(e) => set('birthYear', Number(e.target.value))} />
        </label>
        <label>
          Miasto
          <input value={form.city} onChange={(e) => set('city', e.target.value)} maxLength={60} />
        </label>
      </div>
      <label>
        Opis ({form.bio.length}/{LIMITS.maxBioLength})
        <textarea
          value={form.bio}
          onChange={(e) => set('bio', e.target.value)}
          maxLength={LIMITS.maxBioLength}
          rows={4}
          placeholder="Napisz coś o sobie. Najlepiej coś śmiesznego 😉"
        />
      </label>
      <p className="small muted">Mój humor (max {LIMITS.maxHumorTags}):</p>
      <TagPicker value={form.humorTags} onChange={(t) => set('humorTags', t)} max={LIMITS.maxHumorTags} />
      <fieldset>
        <legend>Jestem</legend>
        <div className="chips">
          {GENDERS.map((g) => (
            <button
              type="button"
              key={g.id}
              className={`chip ${form.gender === g.id ? 'chip-on' : ''}`}
              onClick={() => set('gender', g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend>Szukam</legend>
        <div className="chips">
          {GENDERS.map((g) => (
            <button
              type="button"
              key={g.id}
              className={`chip ${form.lookingFor.includes(g.id) ? 'chip-on' : ''}`}
              onClick={() => toggleLookingFor(g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="row">
        <label>
          Wiek od
          <input
            type="number"
            min={18}
            max={99}
            value={form.ageMin}
            onChange={(e) => set('ageMin', Number(e.target.value))}
          />
        </label>
        <label>
          do
          <input
            type="number"
            min={18}
            max={99}
            value={form.ageMax}
            onChange={(e) => set('ageMax', Number(e.target.value))}
          />
        </label>
      </div>
      {status && <p className={status.includes('✅') ? 'success' : 'error'}>{status}</p>}
      <button className="primary">Zapisz profil</button>
    </form>
  );
}
