import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';

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
  const { rows } = await pool.query(
    'INSERT INTO media (filename, mime, size_bytes, data) VALUES ($1, $2, $3, $4) RETURNING id',
    [file.name || 'fichier', mime, buf.length, buf],
  );
  return NextResponse.json({ id: rows[0].id, url: `/api/media/${rows[0].id}` });
}
