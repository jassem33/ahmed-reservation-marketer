import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { getSite } from '@/lib/site';
import { frDate } from '@/lib/booking';
import { brandedEmail, flushMailQueue, queueMail } from '@/lib/mail';

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
     RETURNING name, email, service, to_char(date, 'YYYY-MM-DD') AS date, slot`,
    [Number(id), status],
  );
  if (!rows[0]) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  const r = rows[0];

  if (status === 'confirmed' || status === 'cancelled') {
    const site = await getSite();
    const siteTitle = site.theme.brand.siteTitle;
    const accent = site.theme.colors.primary;
    const confirmed = status === 'confirmed';
    await queueMail(
      r.email,
      confirmed
        ? `Réservation confirmée ✅ — ${siteTitle}`
        : `Réservation annulée — ${siteTitle}`,
      brandedEmail({
        siteTitle,
        accent,
        title: confirmed ? 'Votre réservation est confirmée ✅' : 'Votre réservation a été annulée',
        intro: confirmed
          ? `Bonne nouvelle ${r.name} : votre rendez-vous est confirmé. À très bientôt !`
          : `Bonjour ${r.name}, votre réservation a été annulée. Vous pouvez en reprendre une à tout moment sur notre site.`,
        rows: [
          ['Service', r.service || '—'],
          ['Date', frDate(r.date)],
          ['Heure', r.slot],
        ],
        outro: 'Une question ? Répondez simplement à cet e-mail.',
      }),
    );
    void flushMailQueue().catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
