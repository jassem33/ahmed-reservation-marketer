/**
 * Génère une affiche (poster) pour chaque vidéo du document qui n'en a pas :
 * la première image de la vidéo est capturée dans un navigateur headless,
 * enregistrée en JPEG dans Postgres, puis reliée au champ posterId.
 * Usage : node scripts/make-posters.mjs [baseUrl]   (défaut http://localhost:3001)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] || 'http://localhost:3001';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query('SELECT theme, page FROM site WHERE id = 1');
if (!rows[0]) {
  console.error('Aucun site en base.');
  process.exit(1);
}
const { theme, page } = rows[0];

// vidéos sans affiche
const targets = [];
for (const sec of page.sections) {
  if (sec.type !== 'media') continue;
  for (const item of sec.data.items ?? []) {
    if (item.mediaId && !item.posterId) targets.push(item);
  }
}
if (!targets.length) {
  console.log('Toutes les vidéos ont déjà une affiche.');
  process.exit(0);
}
console.log(`${targets.length} affiches à générer…`);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const tab = await browser.newPage();
await tab.goto(BASE, { waitUntil: 'domcontentloaded' });

for (const item of targets) {
  const dataUrl = await tab.evaluate(
    (src) =>
      new Promise((resolve, reject) => {
        const v = document.createElement('video');
        v.muted = true;
        v.preload = 'auto';
        v.src = src;
        const fail = setTimeout(() => reject(new Error('timeout')), 30000);
        v.addEventListener('loadeddata', () => {
          v.currentTime = Math.min(0.5, (v.duration || 1) / 4);
        });
        v.addEventListener('seeked', () => {
          try {
            const c = document.createElement('canvas');
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            c.getContext('2d').drawImage(v, 0, 0);
            clearTimeout(fail);
            resolve(c.toDataURL('image/jpeg', 0.82));
          } catch (e) {
            clearTimeout(fail);
            reject(e);
          }
        });
        v.addEventListener('error', () => {
          clearTimeout(fail);
          reject(new Error('lecture impossible'));
        });
      }),
    `/api/media/${item.mediaId}`,
  );
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const r = await pool.query(
    'INSERT INTO media (filename, mime, size_bytes, data) VALUES ($1, $2, $3, $4) RETURNING id',
    [`poster-${item.mediaId}.jpg`, 'image/jpeg', buf.length, buf],
  );
  item.posterId = r.rows[0].id;
  console.log(`  ✓ affiche ${(buf.length / 1024).toFixed(0)} Ko pour ${item.mediaId.slice(0, 8)}…`);
}
await browser.close();

await pool.query('INSERT INTO revisions (theme, page) VALUES ($1, $2)', [theme, page]);
await pool.query('UPDATE site SET page = $1, updated_at = now() WHERE id = 1', [page]);
console.log('✓ Affiches enregistrées et document mis à jour.');
await pool.end();
