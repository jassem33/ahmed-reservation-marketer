import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { flushMailQueue } from '@/lib/mail';
import { queueCancellationMail, queueConfirmationMail } from '@/lib/reservation-mail';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const { id } = await params;
  const { status } = await req.json().catch(() => ({}));
  if (!/^\d+$/.test(id) || !['pending', 'confirmed', 'cancelled'].includes(status)) {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
  const { rows } = await pool.query(
    `UPDATE reservations SET status = $2 WHERE id = $1
     RETURNING id, name, email, service, to_char(date, 'YYYY-MM-DD') AS date, slot`,
    [Number(id), status],
  );
  if (!rows[0]) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  const r = rows[0];

  if (status === 'confirmed' && r.email) {
    await queueConfirmationMail(r);
    void flushMailQueue().catch(() => {});
  } else if (status === 'cancelled' && r.email) {
    await queueCancellationMail(r);
    void flushMailQueue().catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
