import crypto from 'crypto';
import { cookies } from 'next/headers';

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
export const COOKIE = 'wl_session';

export function sign(username: string, days = 7): string {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + days * 86_400_000 }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verify(token?: string | null): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof data.u !== 'string' || typeof data.exp !== 'number' || Date.now() > data.exp)
      return null;
    return data.u;
  } catch {
    return null;
  }
}

export async function currentAdmin(): Promise<string | null> {
  const store = await cookies();
  return verify(store.get(COOKIE)?.value);
}
