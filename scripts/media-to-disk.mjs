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
import { mkdir, open, stat, unlink } from 'node:fs/promises';
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

/* Lecture par tranches de 8 Mo plutôt qu'en un seul `SELECT data`.
 * Un `SELECT` complet sur une vidéo de 116 Mo fait grimper le processus à
 * ~1,2 Go (le pilote pg recopie plusieurs fois le tampon) : sur ce serveur de
 * 2 Go le noyau a déjà tué next-server pour cette raison. Ici la mémoire reste
 * plate quelle que soit la taille du média. */
const CHUNK = 8 * 1024 * 1024;

async function copyToDisk(id, dest) {
  const fh = await open(dest, 'w');
  try {
    let written = 0;
    for (;;) {
      const { rows } = await pool.query(
        'SELECT substring(data FROM $2 FOR $3) AS chunk FROM media WHERE id = $1',
        [id, written + 1, CHUNK],
      );
      const chunk = rows[0]?.chunk;
      if (!chunk || chunk.length === 0) break;
      await fh.write(chunk);
      written += chunk.length;
      if (chunk.length < CHUNK) break;
    }
    return written;
  } finally {
    await fh.close();
  }
}

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
    const written = await copyToDisk(row.id, dest);
    if (written === 0) {
      await unlink(dest).catch(() => {});
      console.warn(`⚠ ${row.id} (${row.filename}) : contenu vide, laissé en base`);
      skipped++;
      continue;
    }
    const onDisk = (await stat(dest)).size;
    if (onDisk !== written) {
      throw new Error(`taille sur disque ${onDisk} ≠ octets copiés ${written}`);
    }
    // Une métadonnée fausse n'invalide pas la copie : on la recale (UPDATE plus bas).
    if (onDisk !== Number(row.size)) {
      console.warn(`  ⚠ size_bytes annoncé ${row.size}, réel ${onDisk} — recalé`);
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
