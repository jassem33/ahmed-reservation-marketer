import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { id } = await req.json().catch(() => ({}));
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 });
  }
  const { rows } = await pool.query('SELECT theme, page FROM revisions WHERE id = $1', [id]);
  if (!rows[0]) return NextResponse.json({ error: 'Révision introuvable' }, { status: 404 });
  await pool.query(
    `INSERT INTO site (id, theme, page) VALUES (1, $1, $2)
     ON CONFLICT (id) DO UPDATE SET theme = $1, page = $2, updated_at = now()`,
    [rows[0].theme, rows[0].page],
  );
  return NextResponse.json({ theme: rows[0].theme, page: rows[0].page });
}
