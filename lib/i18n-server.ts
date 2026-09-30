import { pool } from './db';
import { DEFAULT_I18N, normalizeI18n, type I18nConfig } from './i18n';

export async function getI18n(): Promise<I18nConfig> {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'i18n'");
    return rows[0] ? normalizeI18n(rows[0].value) : structuredClone(DEFAULT_I18N);
  } catch {
    return structuredClone(DEFAULT_I18N);
  }
}

export async function saveI18n(cfg: I18nConfig): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('i18n', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [cfg],
  );
}

/** Langues pour lesquelles un document a déjà été enregistré. */
export async function translatedLocales(): Promise<string[]> {
  const { rows } = await pool.query('SELECT locale FROM site');
  return rows.map((r) => r.locale as string);
}
