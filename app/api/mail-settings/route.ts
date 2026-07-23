import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { flushMailQueue, getMailConfig, saveMailConfig } from '@/lib/mail';

async function queueStats() {
  const { rows } = await pool.query(
    `SELECT
       count(*) FILTER (WHERE status = 'queued')::int AS queued,
       count(*) FILTER (WHERE status = 'sent')::int AS sent,
       count(*) FILTER (WHERE status = 'error')::int AS failed
     FROM mail_queue`,
  );
  const { rows: errs } = await pool.query(
    "SELECT to_email, error FROM mail_queue WHERE status = 'error' ORDER BY id DESC LIMIT 3",
  );
  return { ...rows[0], lastErrors: errs };
}

export async function GET() {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  return NextResponse.json({ config: await getMailConfig(), stats: await queueStats() });
}

export async function PUT(req: NextRequest) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
  const cfg = {
    host: String(body.host ?? '').trim(),
    port: Number(body.port ?? 465) || 465,
    secure: body.secure !== false,
    user: String(body.user ?? '').trim(),
    pass: String(body.pass ?? ''),
    from: String(body.from ?? '').trim(),
    adminEmail: String(body.adminEmail ?? '').trim(),
  };
  await saveMailConfig(cfg);
  // essaie aussitôt d'écouler la file avec la nouvelle configuration
  const flush = await flushMailQueue().catch(() => null);
  return NextResponse.json({ ok: true, flush, stats: await queueStats() });
}
