import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { getSite } from '@/lib/site';
import {
  bookingConfigFrom,
  frDate,
  isValidDateStr,
  isValidSlot,
  slotsForDate,
  waLink,
} from '@/lib/booking';
import { brandedEmail, getMailConfig, queueMail, flushMailQueue } from '@/lib/mail';

export async function GET(req: NextRequest) {
  if (!(await currentAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  if (req.nextUrl.searchParams.get('count')) {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM reservations WHERE status = 'pending'",
    );
    return NextResponse.json({ pending: rows[0].n });
  }
  const { rows } = await pool.query(
    `SELECT id, name, email, phone, service, to_char(date, 'YYYY-MM-DD') AS date, slot, message, status, created_at
     FROM reservations ORDER BY date DESC, slot DESC LIMIT 200`,
  );
  return NextResponse.json({ reservations: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
  const { name, email, phone, service, date, slot, message, website } = body as Record<string, unknown>;
  // pot de miel anti-robots : le champ caché doit rester vide
  if (website) return NextResponse.json({ ok: true });

  const nameS = String(name ?? '').trim();
  const emailS = String(email ?? '').trim();
  const phoneS = String(phone ?? '').trim();
  const dateS = String(date ?? '');
  const slotS = String(slot ?? '');
  if (nameS.length < 2 || nameS.length > 120) {
    return NextResponse.json({ error: 'Nom invalide' }, { status: 400 });
  }
  if (emailS && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailS)) {
    return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 });
  }
  if (phoneS.replace(/\D/g, '').length < 8) {
    return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 });
  }
  if (!isValidDateStr(dateS) || !isValidSlot(slotS)) {
    return NextResponse.json({ error: 'Date ou créneau invalide' }, { status: 400 });
  }

  const site = await getSite();
  const booking = site.page.sections.find((s) => s.type === 'booking');
  if (!booking) return NextResponse.json({ error: 'Réservations désactivées' }, { status: 400 });
  const cfg = bookingConfigFrom(booking.data);
  const { rows: bookedRows } = await pool.query(
    "SELECT slot FROM reservations WHERE date = $1 AND status <> 'cancelled'",
    [dateS],
  );
  const free = slotsForDate(cfg, dateS, bookedRows.map((r) => String(r.slot)));
  if (!free.includes(slotS)) {
    return NextResponse.json({ error: 'Ce créneau n’est plus disponible' }, { status: 409 });
  }

  let id: number;
  try {
    const { rows } = await pool.query(
      `INSERT INTO reservations (name, email, phone, service, date, slot, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [nameS, emailS, phoneS, String(service ?? '').slice(0, 200), dateS, slotS, String(message ?? '').slice(0, 2000)],
    );
    id = rows[0].id;
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'Ce créneau vient d’être réservé' }, { status: 409 });
    }
    throw e;
  }

  // e-mails : accusé de réception au client + notification à l'admin
  const siteTitle = site.theme.brand.siteTitle;
  const accent = site.theme.colors.primary;
  const details: Array<[string, string]> = [
    ['Service', String(service ?? '—')],
    ['Date', frDate(dateS)],
    ['Heure', slotS],
    ['Nom', nameS],
    ['WhatsApp', phoneS],
  ];
  if (emailS) {
    await queueMail(
      emailS,
      `Demande de réservation reçue — ${siteTitle}`,
      brandedEmail({
        siteTitle,
        accent,
        title: 'Votre demande est bien reçue ✅',
        intro: `Merci ${nameS} ! Nous avons bien reçu votre demande de réservation. Vous recevrez une confirmation très vite.`,
        rows: details,
        outro: 'Besoin de modifier ou d’annuler ? Répondez simplement à cet e-mail.',
      }),
    );
  }
  const mailCfg = await getMailConfig();
  if (mailCfg.adminEmail) {
    await queueMail(
      mailCfg.adminEmail,
      `📅 Nouvelle réservation — ${nameS} · ${frDate(dateS)} ${slotS}`,
      brandedEmail({
        siteTitle,
        accent,
        title: 'Nouvelle demande de réservation',
        intro: 'Une nouvelle demande vient d’arriver sur votre site.',
        rows: [...details, ['E-mail client', emailS || '—'], ['Message', String(message ?? '—') || '—']],
        ctaLabel: 'Répondre sur WhatsApp',
        ctaUrl:
          waLink(phoneS, `Bonjour ${nameS}, bien reçu votre demande de réservation (${frDate(dateS)} à ${slotS}) — je vous confirme rapidement !`) ??
          undefined,
      }),
    );
  }
  void flushMailQueue().catch(() => {});

  // lien WhatsApp de confirmation côté client (vers le numéro du site)
  const footer = site.page.sections.find((s) => s.type === 'footer');
  const wa = waLink(
    String(footer?.data?.whatsapp ?? ''),
    `Bonjour, je viens de réserver « ${String(service ?? '')} » le ${frDate(dateS)} à ${slotS} au nom de ${nameS}. Merci de me confirmer 🙏`,
  );
  return NextResponse.json({ ok: true, id, whatsapp: wa });
}
