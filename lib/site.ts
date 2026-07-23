import { pool } from './db';
import { DEFAULT_SITE } from './defaults';
import type { SiteDoc } from './types';

export async function getSite(): Promise<SiteDoc> {
  const { rows } = await pool.query('SELECT theme, page FROM site WHERE id = 1');
  if (!rows[0]) return DEFAULT_SITE;
  return { theme: rows[0].theme, page: rows[0].page };
}
