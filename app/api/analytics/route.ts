import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';

const KINDS = new Set(['view', 'click', 'scroll']);
const trunc = (v: unknown, n: number) => (v == null ? null : String(v).slice(0, n));

// Enregistrement d'un événement visiteur (public, sans authentification)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
  const { sessionId, kind, label, path, referrer, device } = body as Record<string, unknown>;
  const sid = trunc(sessionId, 64);
  const k = String(kind ?? '');
  if (!sid || !KINDS.has(k)) {
    return NextResponse.json({ error: 'Événement invalide' }, { status: 400 });
  }
  await pool.query(
    `INSERT INTO analytics_events (session_id, kind, label, path, referrer, device)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [sid, k, trunc(label, 120), trunc(path, 300), trunc(referrer, 300), trunc(device, 20)],
  );
  return NextResponse.json({ ok: true });
}

// Statistiques agrégées (réservé à l'administrateur)
export async function GET(req: NextRequest) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const daysRaw = Number(req.nextUrl.searchParams.get('days') ?? 30);
  const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30;
  const since = `${days} days`;

  const [totals, byDay, scroll, clicks, devices] = await Promise.all([
    pool.query(
      `SELECT
         count(*) FILTER (WHERE kind = 'view')::int AS views,
         count(*) FILTER (WHERE kind = 'click')::int AS clicks,
         count(DISTINCT session_id)::int AS visitors
       FROM analytics_events
       WHERE created_at >= now() - $1::interval`,
      [since],
    ),
    pool.query(
      `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
              count(*) FILTER (WHERE kind = 'view')::int AS views,
              count(DISTINCT session_id)::int AS visitors
       FROM analytics_events
       WHERE created_at >= now() - $1::interval
       GROUP BY 1 ORDER BY 1`,
      [since],
    ),
    pool.query(
      `SELECT label AS depth, count(DISTINCT session_id)::int AS sessions
       FROM analytics_events
       WHERE kind = 'scroll' AND created_at >= now() - $1::interval
       GROUP BY 1 ORDER BY 1`,
      [since],
    ),
    pool.query(
      `SELECT coalesce(label, '(sans nom)') AS label, count(*)::int AS count
       FROM analytics_events
       WHERE kind = 'click' AND created_at >= now() - $1::interval
       GROUP BY 1 ORDER BY count DESC LIMIT 12`,
      [since],
    ),
    pool.query(
      `SELECT coalesce(nullif(device, ''), 'inconnu') AS device, count(DISTINCT session_id)::int AS sessions
       FROM analytics_events
       WHERE created_at >= now() - $1::interval
       GROUP BY 1 ORDER BY sessions DESC`,
      [since],
    ),
  ]);

  return NextResponse.json({
    days,
    totals: totals.rows[0] ?? { views: 0, clicks: 0, visitors: 0 },
    byDay: byDay.rows,
    scroll: scroll.rows,
    clicks: clicks.rows,
    devices: devices.rows,
  });
}
