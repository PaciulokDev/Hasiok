import { useState, type FormEvent } from 'react';
import { GENDERS, type Gender } from '@hasiok/shared';
import { api, useAuth } from '../auth';

export function AuthPage() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthYear, setBirthYear] = useState(2000);
  const [gender, setGender] = useState<Gender>('woman');
  const [lookingFor, setLookingFor] = useState<Gender[]>(['man']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register({ email, password, nickname, birthYear, gender, lookingFor });
      signIn(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const toggleLookingFor = (g: Gender) =>
    setLookingFor((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  return (
    <div className="auth">
      <div className="hero">
        <div className="hero-emoji">😂💘</div>
        <h1>Hasiok</h1>
        <p>Randki bez selfie. Pokaż swoje memy, a my znajdziemy kogoś, kto śmieje się z tego samego.</p>
      </div>

      <form className="card" onSubmit={submit}>
        <div className="tabs">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Logowanie
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            Rejestracja
          </button>
        </div>

        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Hasło
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {mode === 'register' && (
          <>
            <label>
              Nick
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} required minLength={2} maxLength={30} />
            </label>
            <label>
              Rok urodzenia
              <input type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} required />
            </label>
            <fieldset>
              <legend>Jestem</legend>
              <div className="chips">
                {GENDERS.map((g) => (
                  <button type="button" key={g.id} className={`chip ${gender === g.id ? 'chip-on' : ''}`} onClick={() => setGender(g.id)}>
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
                    className={`chip ${lookingFor.includes(g.id) ? 'chip-on' : ''}`}
                    onClick={() => toggleLookingFor(g.id)}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {error && <p className="error">{error}</p>}
        <button className="primary" disabled={busy}>
          {mode === 'login' ? 'Zaloguj się' : 'Załóż konto'}
        </button>
        {mode === 'login' && <p className="muted small">Konto demo: kasia404@demo.hasiok.pl / hasiok123 (po `npm run seed`)</p>}
      </form>
    </div>
  );
}
