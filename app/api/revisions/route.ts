import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const locale = (req.nextUrl.searchParams.get('locale') || 'fr').toLowerCase();
  const { rows } = await pool.query(
    'SELECT id, saved_at FROM revisions WHERE locale = $1 ORDER BY id DESC LIMIT 30',
    [locale],
  );
  return NextResponse.json({ revisions: rows });
}
