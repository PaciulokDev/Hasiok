import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Candidate } from '@hasiok/shared';
import { api, useAuth } from '../auth';
import { ProfileCard } from '../components/ProfileCard';

export function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState('');
  const [match, setMatch] = useState<{ id: number; nickname: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError('');
    api.discover().then(setCandidates, (err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  const current = candidates?.[0];

  async function decide(liked: boolean) {
    if (!current || busy) return;
    setBusy(true);
    try {
      const res = await api.swipe(current.profile.id, liked);
      if (res.matched && res.matchId) setMatch({ id: res.matchId, nickname: current.profile.nickname });
      setCandidates((list) => list?.slice(1) ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function report() {
    if (!current) return;
    const reason = window.prompt('Co jest nie tak z tym profilem? (np. zdjęcia osób zamiast memów)');
    if (!reason) return;
    await api.report(current.profile.id, reason).catch((err) => setError(err.message));
    await decide(false);
  }

  return (
    <div className="stack">
      {user && user.memes.length === 0 && (
        <div className="banner">
          🖼️ Nie masz jeszcze memów w galerii — inni Cię nie widzą. <Link to="/profile">Dodaj memy</Link>
        </div>
      )}
      {user && user.reactionsCount < 10 && (
        <div className="banner">
          🎯 Oceń kilka memów, żeby dopasowania były trafniejsze. <Link to="/feed">Oceniaj memy</Link>
        </div>
      )}
      {error && <p className="error">{error}</p>}

      {candidates === null && !error && <p className="muted center">Szukam ludzi z podobnym humorem…</p>}
      {candidates?.length === 0 && (
        <div className="card center">
          <p>🦗 Na razie nikogo nowego. Wróć później albo poszerz preferencje w profilu.</p>
          <button onClick={load}>Odśwież</button>
        </div>
      )}

      {current && (
        <div className="card">
          <div className="score">
            <span className="score-value">{current.score}%</span>
            <span className="muted">zgodności humoru</span>
          </div>
          {current.reasons.length > 0 && (
            <ul className="reasons">
              {current.reasons.map((r) => (
                <li key={r.kind}>{r.text}</li>
              ))}
            </ul>
          )}
          <ProfileCard profile={current.profile} />
          <div className="actions">
            <button className="big" onClick={() => decide(false)} disabled={busy}>
              😐 Nie mój humor
            </button>
            <button className="big primary" onClick={() => decide(true)} disabled={busy}>
              😂 Śmieszne!
            </button>
          </div>
          <button className="link small" onClick={report}>
            Zgłoś profil
          </button>
        </div>
      )}

      {match && (
        <div className="modal" role="dialog">
          <div className="card center">
            <div className="hero-emoji">🎉😂🎉</div>
            <h2>Jest para!</h2>
            <p>Ty i {match.nickname} śmiejecie się z tego samego.</p>
            <button className="primary" onClick={() => navigate(`/matches/${match.id}`)}>
              Wyślij mema na przełamanie lodów
            </button>
            <button className="link" onClick={() => setMatch(null)}>
              Oglądaj dalej
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
