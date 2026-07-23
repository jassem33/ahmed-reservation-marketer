import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';

export async function GET() {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { rows } = await pool.query(
    'SELECT id, saved_at FROM revisions ORDER BY id DESC LIMIT 30',
  );
  return NextResponse.json({ revisions: rows });
}
