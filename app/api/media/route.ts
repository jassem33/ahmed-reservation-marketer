import { NextRequest, NextResponse } from 'next/server';
import { unlink, writeFile } from 'node:fs/promises';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { ensureMediaDir, mediaPath } from '@/lib/media';

const MAX_BYTES = 300 * 1024 * 1024; // 300 Mo

export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 });
  }
  const mime = file.type || 'application/octet-stream';
  if (!/^(image|video)\//.test(mime)) {
    return NextResponse.json({ error: 'Seules les images et vidéos sont acceptées' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 300 Mo)' }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());

  // La base ne garde que les métadonnées ; le contenu part sur le disque
  // (voir lib/media.ts). `data` reste NULL pour les nouveaux médias.
  const { rows } = await pool.query(
    'INSERT INTO media (filename, mime, size_bytes) VALUES ($1, $2, $3) RETURNING id',
    [file.name || 'fichier', mime, buf.length],
  );
  const id: string = rows[0].id;
  try {
    await ensureMediaDir();
    await writeFile(mediaPath(id), buf);
  } catch (e) {
    // Pas de ligne orpheline pointant vers un fichier absent.
    await pool.query('DELETE FROM media WHERE id = $1', [id]).catch(() => {});
    await unlink(mediaPath(id)).catch(() => {});
    console.error('Écriture du média impossible', e);
    return NextResponse.json({ error: "Le fichier n'a pas pu être enregistré" }, { status: 500 });
  }
  return NextResponse.json({ id, url: `/api/media/${id}` });
}
