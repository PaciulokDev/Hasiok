import { createApp } from './app';
import { config } from './config';
import { openDb } from './db';

const db = openDb(config.dbFile);
const app = createApp({ db, uploadDir: config.uploadDir, jwtSecret: config.jwtSecret, webDist: config.webDist });

// 0.0.0.0, żeby telefon w tej samej sieci Wi-Fi mógł się połączyć z serwerem.
app.listen(config.port, '0.0.0.0', () => {
  console.log(`🗑️  Hasiok API działa na http://localhost:${config.port}`);
});
