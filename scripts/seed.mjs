import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Charge .env.local si présent (en conteneur, les variables viennent de l'environnement)
try {
  for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* pas de .env.local : on utilise l'environnement */
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const reset = process.argv.includes('--reset');

// 1. Schéma
await pool.query(readFileSync(path.join(root, 'db', 'schema.sql'), 'utf8'));

// 2. Compte administrateur
const username = process.env.ADMIN_USERNAME || 'admin';
const password = process.env.ADMIN_PASSWORD || 'admin123';
await pool.query(
  'INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING',
  [username, bcrypt.hashSync(password, 10)],
);

// 3. Contenu par défaut + médias d'exemple
const existing = await pool.query('SELECT 1 FROM site WHERE id = 1');
if (existing.rows[0] && !reset) {
  console.log('ℹ Site déjà initialisé — lancez « npm run seed -- --reset » pour repartir du modèle.');
} else {
  const site = JSON.parse(readFileSync(path.join(root, 'lib', 'default-site.json'), 'utf8'));

  const svg = (w, h, label, emoji) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#551ab2"/><stop offset="1" stop-color="#221040"/>` +
    `</linearGradient></defs>` +
    `<rect width="${w}" height="${h}" fill="url(#g)"/>` +
    `<text x="50%" y="46%" font-family="Helvetica,Arial,sans-serif" font-size="${Math.round(w / 7)}" text-anchor="middle" fill="rgba(255,255,255,.9)">${emoji}</text>` +
    (label
      ? `<text x="50%" y="58%" font-family="Helvetica,Arial,sans-serif" font-size="${Math.round(w / 20)}" text-anchor="middle" fill="rgba(255,255,255,.75)">${label}</text>`
      : '') +
    `</svg>`;

  const insertedIds = [];
  const insertMedia = async (name, w, h, label, emoji) => {
    const buf = Buffer.from(svg(w, h, label, emoji), 'utf8');
    const r = await pool.query(
      'INSERT INTO media (filename, mime, size_bytes, data) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, 'image/svg+xml', buf.length, buf],
    );
    insertedIds.push(r.rows[0].id);
    return r.rows[0].id;
  };

  const hero = site.page.sections.find((s) => s.type === 'hero');
  hero.data.photo.mediaId = await insertMedia('portrait.svg', 900, 1125, 'Votre photo', '📸');
  hero.data.logo.mediaId = await insertMedia('logo.svg', 240, 240, '', '◆');

  const websites = site.page.sections.find((s) => s.type === 'websites');
  for (let i = 0; i < websites.data.items.length; i++) {
    websites.data.items[i].shot.mediaId = await insertMedia(
      `site-${i + 1}.svg`,
      480,
      1000,
      websites.data.items[i].name.text,
      '🛍️',
    );
  }

  if (reset) {
    await pool.query('DELETE FROM site');
    await pool.query('DELETE FROM revisions');
    await pool.query('DELETE FROM media WHERE NOT (id = ANY($1::uuid[]))', [insertedIds]);
  }
  await pool.query(
    `INSERT INTO site (id, theme, page) VALUES (1, $1, $2)
     ON CONFLICT (id) DO UPDATE SET theme = $1, page = $2, updated_at = now()`,
    [site.theme, site.page],
  );
  console.log("✓ Contenu par défaut installé (avec images d'exemple stockées dans Postgres).");
}

console.log(
  `✓ Prêt. Administration : /admin sur le port affiché par « npm run dev » (${username} / ${password})`,
);
await pool.end();
