import { pool } from './db';
import { DEFAULT_SITE } from './defaults';
import type { SiteDoc } from './types';
import type { I18nConfig } from './i18n';
import { findLocale } from './i18n';
import { getI18n } from './i18n-server';

async function readDoc(locale: string): Promise<SiteDoc | null> {
  const { rows } = await pool.query('SELECT theme, page FROM site WHERE locale = $1', [locale]);
  return rows[0] ? { theme: rows[0].theme, page: rows[0].page } : null;
}

/**
 * Document d'une langue. Sans `locale`, celui de la langue par défaut — c'est la
 * version de référence côté serveur (réservations, e-mails, administration).
 *
 * Tant qu'une langue n'a pas encore été enregistrée, on sert une copie du document
 * de la langue par défaut (même mise en page, textes à traduire) — pour une langue
 * de droite à gauche, avec des polices arabes.
 */
export async function getSite(locale?: string, cfg?: I18nConfig): Promise<SiteDoc> {
  const i18n = cfg ?? (await getI18n());
  const code = locale ?? i18n.defaultLocale;
  const own = await readDoc(code);
  if (own) return own;
  const base = (code !== i18n.defaultLocale ? await readDoc(i18n.defaultLocale) : null) ?? DEFAULT_SITE;
  const doc: SiteDoc = structuredClone(base);
  if (findLocale(i18n, code)?.dir === 'rtl') {
    doc.theme = { ...doc.theme, fonts: { heading: 'cairo', body: 'tajawal' } };
  }
  return doc;
}
