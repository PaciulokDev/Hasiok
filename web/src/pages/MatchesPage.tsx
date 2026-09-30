import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MatchSummary } from '@hasiok/shared';
import { api } from '../auth';

export function MatchesPage() {
  const [matches, setMatches] = useState<MatchSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.matches().then(setMatches, (err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!matches) return <p className="muted center">Ładowanie…</p>;
  if (matches.length === 0) {
    return <p className="card center">Jeszcze nie masz par. Polub kilka profili w zakładce „Odkrywaj”! 😂</p>;
  }

  return (
    <div className="stack">
      {matches.map((m) => {
        const cover = m.other.memes[0];
        const last = m.lastMessage;
        return (
          <Link key={m.id} to={`/matches/${m.id}`} className="card match-row">
            {cover ? <img src={api.imageUrl(cover.imageUrl)} alt="" /> : <div className="avatar-placeholder">😂</div>}
            <div>
              <strong>
                {m.other.nickname}, {m.other.age}
              </strong>{' '}
              <span className="badge">{m.score}%</span>
              <p className="muted small">
                {last ? (last.meme ? '🖼️ Mem' : last.body) : 'Nowa para! Wyślij pierwszego mema.'}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
