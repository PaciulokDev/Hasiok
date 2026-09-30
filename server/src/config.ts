import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const config = {
  port: Number(process.env.PORT ?? 4000),
  dbFile: process.env.DB_FILE ?? path.join(serverRoot, 'data', 'hasiok.db'),
  uploadDir: process.env.UPLOAD_DIR ?? path.join(serverRoot, 'data', 'uploads'),
  webDist: path.join(serverRoot, '..', 'web', 'dist'),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-zmien-mnie-na-produkcji',
};

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('Ustaw zmienną środowiskową JWT_SECRET w produkcji');
}
