import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import type { Ctx } from './context';
import { errorHandler } from './errors';
import { accountRoutes } from './routes/account';
import { discoverRoutes } from './routes/discover';
import { matchRoutes } from './routes/matches';
import { memeRoutes } from './routes/memes';
import { userRoutes } from './routes/users';

export interface AppOptions extends Ctx {
  /** Folder ze zbudowaną aplikacją webową (opcjonalnie — w produkcji serwer może ją serwować). */
  webDist?: string;
}

export function createApp(options: AppOptions) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));

  // Obrazki z memami. Blokujemy wykonywanie czegokolwiek poza wyświetleniem obrazka.
  app.use(
    '/uploads',
    express.static(options.uploadDir, {
      maxAge: '7d',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
      },
    }),
  );

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ ok: true });
  });
  api.use(accountRoutes(options));
  api.use(memeRoutes(options));
  api.use(discoverRoutes(options));
  api.use(matchRoutes(options));
  api.use(userRoutes(options));
  api.use((_req, res) => {
    res.status(404).json({ error: 'Nie ma takiego adresu API' });
  });
  app.use('/api', api);

  if (options.webDist && fs.existsSync(options.webDist)) {
    app.use(express.static(options.webDist));
    app.get(/^(?!\/(api|uploads)\/).*/, (_req, res) => {
      res.sendFile(path.join(options.webDist!, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
