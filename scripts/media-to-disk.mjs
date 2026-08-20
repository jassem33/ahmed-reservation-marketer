/* Déplace les médias historiques de la colonne `media.data` (BYTEA) vers le
 * disque (répertoire MEDIA_DIR). Idempotent : les lignes déjà migrées ont
 * `data` à NULL et sont ignorées.
 *
 * Prudence volontaire : le contenu n'est effacé de la base qu'après avoir
 * vérifié que le fichier écrit fait exactement la bonne taille. En cas de
 * doute la ligne est laissée intacte et continue d'être servie depuis la base.
 *
 * Usage (dans le conteneur app) : node scripts/media-to-disk.mjs
 */
import { readFileSync } from 'node:fs';
import { mkdir, writeFile, stat, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

// `import.meta.dirname` n'existe qu'à partir de Node 20.11 : même motif que seed.mjs.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* pas de .env.local : on utilise l'environnement */
}

const MEDIA_DIR = process.env.MEDIA_DIR || path.join(root, 'media-store');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

await mkdir(MEDIA_DIR, { recursive: true });

const { rows: todo } = await pool.query(
  'SELECT id, filename, size_bytes::bigint AS size FROM media WHERE data IS NOT NULL ORDER BY created_at',
);
console.log(`${todo.length} média(s) à déplacer vers ${MEDIA_DIR}`);

let moved = 0;
let skipped = 0;
for (const row of todo) {
  const dest = path.join(MEDIA_DIR, row.id);
  try {
    // Une ligne à la fois : jamais plus d'un média en mémoire.
    const { rows } = await pool.query('SELECT data FROM media WHERE id = $1', [row.id]);
    const buf = rows[0]?.data;
    if (!buf) {
      console.warn(`⚠ ${row.id} (${row.filename}) : contenu introuvable, ignoré`);
      skipped++;
      continue;
    }
    await writeFile(dest, buf);
    const onDisk = (await stat(dest)).size;
    if (onDisk !== buf.length) {
      throw new Error(`taille écrite ${onDisk} ≠ attendue ${buf.length}`);
    }
    // `size_bytes` est recalé si la métadonnée était fausse.
    await pool.query('UPDATE media SET data = NULL, size_bytes = $2 WHERE id = $1', [row.id, onDisk]);
    moved++;
    console.log(`✓ ${row.filename} (${(onDisk / 1024 / 1024).toFixed(1)} Mo) → ${row.id}`);
  } catch (e) {
    // Le fichier douteux est retiré : la ligne reste servie depuis la base.
    await unlink(dest).catch(() => {});
    skipped++;
    console.error(`✗ ${row.id} (${row.filename}) : ${e.message} — laissé en base`);
  }
}

console.log(`\n${moved} déplacé(s), ${skipped} laissé(s) en base.`);
if (moved > 0) {
  // Sans VACUUM FULL les pages libérées restent réservées par la table :
  // le dump maigrit tout de suite, le volume Postgres non.
  console.log('Compactage de la table media (VACUUM FULL)…');
  await pool.query('VACUUM FULL media');
  const { rows } = await pool.query(
    "SELECT pg_size_pretty(pg_total_relation_size('media')) AS media, pg_size_pretty(pg_database_size(current_database())) AS db",
  );
  console.log(`✓ table media : ${rows[0].media} · base : ${rows[0].db}`);
}
await pool.end();
