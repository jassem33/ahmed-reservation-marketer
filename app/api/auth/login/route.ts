import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { pool } from '@/lib/db';
import { COOKIE, sign } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body as { username?: unknown; password?: unknown };
  if (typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Identifiants requis' }, { status: 400 });
  }
  const { rows } = await pool.query('SELECT password_hash FROM admins WHERE username = $1', [
    username,
  ]);
  const ok = rows[0] && (await bcrypt.compare(password, rows[0].password_hash));
  if (!ok) return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, sign(username), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 86_400,
  });
  return res;
}
