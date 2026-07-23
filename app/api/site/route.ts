import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { getSite } from '@/lib/site';

export async function GET() {
  return NextResponse.json(await getSite());
}

export async function PUT(req: NextRequest) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const valid =
    body &&
    typeof body === 'object' &&
    body.theme?.colors &&
    typeof body.theme.colors === 'object' &&
    Array.isArray(body.page?.sections);
  if (!valid) return NextResponse.json({ error: 'Document invalide' }, { status: 400 });
  if (JSON.stringify(body).length > 3_000_000) {
    return NextResponse.json({ error: 'Document trop volumineux' }, { status: 413 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO site (id, theme, page) VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE SET theme = $1, page = $2, updated_at = now()`,
      [body.theme, body.page],
    );
    await client.query('INSERT INTO revisions (theme, page) VALUES ($1, $2)', [
      body.theme,
      body.page,
    ]);
    await client.query(
      'DELETE FROM revisions WHERE id NOT IN (SELECT id FROM revisions ORDER BY id DESC LIMIT 50)',
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return NextResponse.json({ ok: true, updatedAt: new Date().toISOString() });
}
