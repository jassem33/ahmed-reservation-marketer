import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { getSite } from '@/lib/site';
import { getI18n } from '@/lib/i18n-server';
import { findLocale, resolveLocale } from '@/lib/i18n';

export async function GET(req: NextRequest) {
  const i18n = await getI18n();
  const locale = resolveLocale(i18n, req.nextUrl.searchParams.get('locale'));
  return NextResponse.json(await getSite(locale.code, i18n));
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
  const i18n = await getI18n();
  const locale = findLocale(i18n, req.nextUrl.searchParams.get('locale') ?? i18n.defaultLocale);
  if (!locale) return NextResponse.json({ error: 'Langue inconnue' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO site (id, locale, theme, page) VALUES (1, $3, $1, $2)
       ON CONFLICT (locale) DO UPDATE SET theme = $1, page = $2, updated_at = now()`,
      [body.theme, body.page, locale.code],
    );
    await client.query('INSERT INTO revisions (theme, page, locale) VALUES ($1, $2, $3)', [
      body.theme,
      body.page,
      locale.code,
    ]);
    await client.query(
      `DELETE FROM revisions WHERE locale = $1
       AND id NOT IN (SELECT id FROM revisions WHERE locale = $1 ORDER BY id DESC LIMIT 50)`,
      [locale.code],
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
