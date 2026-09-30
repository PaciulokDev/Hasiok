import { useCallback, useEffect, useState } from 'react';
import { humorTagLabel, REACTIONS, type FeedMeme, type ReactionId } from '@hasiok/shared';
import { api, useAuth } from '../auth';

/** Kalibracja humoru: oceniasz memy innych, a my uczymy się, co Cię śmieszy. */
export function FeedPage() {
  const { refresh } = useAuth();
  const [feed, setFeed] = useState<FeedMeme[] | null>(null);
  const [rated, setRated] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.feed().then(setFeed, (err) => setError(err.message));
  }, []);
  useEffect(load, [load]);

  const meme = feed?.[0];

  async function react(reaction: ReactionId) {
    if (!meme || busy) return;
    setBusy(true);
    try {
      await api.react(meme.id, reaction);
      setRated((n) => n + 1);
      const rest = feed!.slice(1);
      setFeed(rest);
      if (rest.length === 0) load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Odśwież licznik ocen w profilu po wyjściu z tej strony.
  useEffect(() => () => void refresh().catch(() => {}), [refresh]);

  return (
    <div className="stack">
      <div className="card">
        <h2>🎯 Co Cię śmieszy?</h2>
        <p className="muted">
          Oceniaj memy z galerii innych osób. Im więcej ocenisz, tym lepiej dobierzemy ludzi z Twoim poczuciem humoru.
          {rated > 0 && ` Ocenione w tej sesji: ${rated}.`}
        </p>
      </div>
      {error && <p className="error">{error}</p>}
      {feed?.length === 0 && <p className="card center">Oceniono wszystkie memy! 🏆 Wróć, gdy pojawią się nowe.</p>}
      {meme && (
        <div className="card">
          <img className="feed-image" src={api.imageUrl(meme.imageUrl)} alt={meme.caption || 'mem'} />
          <p className="muted small">
            z galerii: {meme.ownerNickname} · {meme.tags.map(humorTagLabel).join(', ')}
          </p>
          <div className="actions">
            {REACTIONS.map((r) => (
              <button key={r.id} className="big" onClick={() => react(r.id)} title={r.label} disabled={busy}>
                {r.emoji}
                <span className="small">{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
