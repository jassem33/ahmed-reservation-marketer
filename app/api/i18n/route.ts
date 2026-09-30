import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { getI18n, saveI18n, translatedLocales } from '@/lib/i18n-server';
import { normalizeI18n } from '@/lib/i18n';

/** Configuration des langues + langues dont le contenu a déjà été enregistré. */
export async function GET() {
  const [config, translated] = await Promise.all([getI18n(), translatedLocales()]);
  return NextResponse.json({ config, translated });
}

/** Enregistre la configuration (libellés, drapeaux, langue par défaut, sélecteur). */
export async function PUT(req: NextRequest) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || !Array.isArray(body.locales) || body.locales.length > 12) {
    return NextResponse.json({ error: 'Configuration invalide' }, { status: 400 });
  }
  const config = normalizeI18n(body);
  await saveI18n(config);
  return NextResponse.json({ ok: true, config, translated: await translatedLocales() });
}

/** Supprime le contenu enregistré d'une langue (elle repart d'une copie de la langue par défaut). */
export async function DELETE(req: NextRequest) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const locale = String(req.nextUrl.searchParams.get('locale') ?? '').toLowerCase();
  const config = await getI18n();
  if (!locale || locale === config.defaultLocale) {
    return NextResponse.json({ error: 'Impossible de réinitialiser la langue par défaut' }, { status: 400 });
  }
  await pool.query('DELETE FROM site WHERE locale = $1', [locale]);
  return NextResponse.json({ ok: true, translated: await translatedLocales() });
}
