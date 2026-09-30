import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { MatchSummary, Message } from '@hasiok/shared';
import { api, useAuth } from '../auth';
import { MemeGrid } from '../components/MemeGrid';
import { ProfileCard } from '../components/ProfileCard';

const POLL_MS = 3000;

export function ChatPage() {
  const matchId = Number(useParams().id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [panel, setPanel] = useState<'none' | 'memes' | 'profile'>('none');
  const [error, setError] = useState('');
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);

  useEffect(() => {
    api.matches().then((all) => {
      const found = all.find((m) => m.id === matchId);
      if (found) setMatch(found);
      else setError('Nie ma takiej pary');
    });
  }, [matchId]);

  // Proste odpytywanie serwera co kilka sekund o nowe wiadomości.
  useEffect(() => {
    lastId.current = 0;
    setMessages([]);
    let stopped = false;
    async function poll() {
      try {
        const fresh = await api.messages(matchId, lastId.current);
        if (!stopped && fresh.length > 0) {
          lastId.current = fresh[fresh.length - 1].id;
          setMessages((prev) => [...prev, ...fresh.filter((m) => !prev.some((p) => p.id === m.id))]);
        }
      } catch (err) {
        if (!stopped) setError((err as Error).message);
      }
    }
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [matchId]);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [messages.length]);

  async function send(content: { body?: string; memeId?: number }) {
    try {
      const msg = await api.sendMessage(matchId, content);
      lastId.current = Math.max(lastId.current, msg.id);
      setMessages((prev) => [...prev, msg]);
      setPanel('none');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    send({ body: text });
    setText('');
  }

  async function unmatch(block: boolean) {
    if (!match) return;
    if (!window.confirm(block ? `Zablokować ${match.other.nickname}?` : `Rozłączyć parę z ${match.other.nickname}?`)) return;
    if (block) await api.block(match.other.id);
    else await api.unmatch(match.id);
    navigate('/matches');
  }

  if (error && !match) return <p className="error">{error}</p>;
  if (!match || !user) return <p className="muted center">Ładowanie…</p>;

  return (
    <div className="chat">
      <div className="chat-header card">
        <button className="link" onClick={() => navigate('/matches')}>
          ←
        </button>
        <strong>{match.other.nickname}</strong>
        <span className="badge">{match.score}%</span>
        <span className="spacer" />
        <button className="link small" onClick={() => setPanel(panel === 'profile' ? 'none' : 'profile')}>
          Profil
        </button>
        <button className="link small" onClick={() => unmatch(false)}>
          Rozłącz
        </button>
        <button className="link small danger" onClick={() => unmatch(true)}>
          Zablokuj
        </button>
      </div>

      {panel === 'profile' && (
        <div className="card">
          <ProfileCard profile={match.other} />
        </div>
      )}

      <div className="messages">
        {messages.length === 0 && <p className="muted center">Przełam lody memem! 🧊🔨</p>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.senderId === user.id ? 'mine' : ''}`}>
            {m.meme && <img src={api.imageUrl(m.meme.imageUrl)} alt={m.meme.caption || 'mem'} />}
            {m.body && <span>{m.body}</span>}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      {error && <p className="error">{error}</p>}

      {panel === 'memes' && (
        <div className="card">
          <p className="small muted">Wyślij mema z Twojej galerii albo z galerii {match.other.nickname}:</p>
          <MemeGrid memes={[...user.memes, ...match.other.memes]} action={{ label: 'Wyślij', onClick: (meme) => send({ memeId: meme.id }) }} />
        </div>
      )}

      <form className="composer" onSubmit={submit}>
        <button type="button" onClick={() => setPanel(panel === 'memes' ? 'none' : 'memes')} title="Wyślij mema">
          🖼️
        </button>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Napisz coś zabawnego…" maxLength={1000} />
        <button className="primary">Wyślij</button>
      </form>
    </div>
  );
}
