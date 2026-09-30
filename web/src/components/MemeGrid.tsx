import { useState } from 'react';
import type { Meme } from '@hasiok/shared';
import { api } from '../auth';

interface Props {
  memes: Meme[];
  /** Dodatkowy przycisk pod każdym memem (np. "Usuń" albo "Wyślij"). */
  action?: { label: string; onClick: (meme: Meme) => void };
}

export function MemeGrid({ memes, action }: Props) {
  const [open, setOpen] = useState<Meme | null>(null);
  if (memes.length === 0) return <p className="muted">Brak memów w galerii.</p>;
  return (
    <>
      <div className="meme-grid">
        {memes.map((meme) => (
          <figure key={meme.id} className="meme-tile">
            <img src={api.imageUrl(meme.imageUrl)} alt={meme.caption || 'mem'} loading="lazy" onClick={() => setOpen(meme)} />
            {action && (
              <button type="button" className="tile-action" onClick={() => action.onClick(meme)}>
                {action.label}
              </button>
            )}
          </figure>
        ))}
      </div>
      {open && (
        <div className="lightbox" onClick={() => setOpen(null)} role="dialog">
          <img src={api.imageUrl(open.imageUrl)} alt={open.caption || 'mem'} />
          {open.caption && <p>{open.caption}</p>}
        </div>
      )}
    </>
  );
}
