import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { currentAdmin } from '@/lib/auth';
import { getSite } from '@/lib/site';
import {
  bookingConfigFrom,
  isOtherDomain,
  frDate,
  isValidDateStr,
  isValidSlot,
  slotsForDate,
  waLink,
} from '@/lib/booking';
import { emailBrand, getMailConfig, queueBrandedMail, flushMailQueue } from '@/lib/mail';
import { queueReceiptMail, prettyPhone } from '@/lib/reservation-mail';
import { leadEventId, sendLeadEvent } from '@/lib/openai-ads';

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
    `SELECT id, name, email, phone, service, to_char(date, 'YYYY-MM-DD') AS date, slot, message,
            social_link, budget, domain, status, created_at
     FROM reservations ORDER BY created_at DESC NULLS LAST LIMIT 200`,
  );
  return NextResponse.json({ reservations: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
  }
  const { name, email, phone, service, date, slot, message, social, budget, domain, domainOther, website } =
    body as Record<string, unknown>;
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
  // Lien de la page à promouvoir : obligatoire, on tolère l'absence de « https:// »
  const socialRaw = String(social ?? '').trim();
  if (!socialRaw) {
    return NextResponse.json(
      { error: 'Le lien de votre page Facebook ou Instagram est obligatoire' },
      { status: 400 },
    );
  }
  const socialS = /^https?:\/\//i.test(socialRaw) ? socialRaw : `https://${socialRaw}`;
  let socialHost: string;
  try {
    socialHost = new URL(socialS).hostname;
  } catch {
    return NextResponse.json({ error: 'Lien de page invalide' }, { status: 400 });
  }
  if (!/(^|\.)((facebook|fb)\.(com|me)|instagram\.com|fb\.watch|instagr\.am)$/i.test(socialHost)) {
    return NextResponse.json(
      { error: 'Indiquez un lien de page Facebook ou Instagram' },
      { status: 400 },
    );
  }
  const budgetS = String(budget ?? '').trim().slice(0, 120);
  // Domaine d'activité : obligatoire ; « Autre » exige une précision libre
  const domainRaw = String(domain ?? '').trim().slice(0, 120);
  if (!domainRaw) {
    return NextResponse.json({ error: "Indiquez votre domaine d'activité" }, { status: 400 });
  }
  let domainS = domainRaw;
  if (isOtherDomain(domainRaw)) {
    const other = String(domainOther ?? '').trim().slice(0, 120);
    if (other.length < 2) {
      return NextResponse.json({ error: "Précisez votre domaine d'activité" }, { status: 400 });
    }
    domainS = `${domainRaw} : ${other}`;
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
      `INSERT INTO reservations (name, email, phone, service, date, slot, message, social_link, budget, domain)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        nameS,
        emailS,
        phoneS,
        String(service ?? '').slice(0, 200),
        dateS,
        slotS,
        String(message ?? '').slice(0, 2000),
        socialS.slice(0, 500),
        budgetS,
        domainS,
      ],
    );
    id = rows[0].id;
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === '23505') {
      return NextResponse.json({ error: 'Ce créneau vient d’être réservé' }, { status: 409 });
    }
    throw e;
  }

  // e-mails : accusé de réception au client + notification à l'admin
  const details: Array<[string, string]> = [
    ['Service', String(service ?? '—')],
    ['Date', frDate(dateS)],
    ['Heure', slotS],
    ['Nom', nameS],
    ['WhatsApp', phoneS],
    ['Page à promouvoir', socialS],
    ["Domaine d'activité", domainS],
  ];
  if (budgetS) details.push(['Budget marketing', budgetS]);
  if (emailS) {
    await queueReceiptMail(
      { id, name: nameS, email: emailS, phone: phoneS, service: String(service ?? '') || null, date: dateS, slot: slotS },
      [
        ['WhatsApp', phoneS],
        ['Page à promouvoir', socialS],
        ["Domaine d'activité", domainS],
        ...(budgetS ? [['Budget marketing', budgetS] as [string, string]] : []),
      ],
    );
  }
  const mailCfg = await getMailConfig();
  if (mailCfg.adminEmail) {
    const msgTrimmed = String(message ?? '').trim();
    await queueBrandedMail(mailCfg.adminEmail, `Nouvelle réservation — ${nameS} · ${frDate(dateS)} ${slotS}`, emailBrand(site), {
      preheader: `${nameS} demande ${String(service ?? 'un rendez-vous')} le ${frDate(dateS)} à ${slotS}.`,
      title: 'Nouvelle demande de réservation',
      intro: 'Une nouvelle demande vient d’arriver sur votre site. Confirmez-la depuis l’administration pour envoyer au client son invitation.',
      highlight: { label: 'Créneau demandé', value: `${frDate(dateS).replace(/^./, (ch) => ch.toUpperCase())} · ${slotS}`, detail: String(service ?? '') || undefined },
      rows: [
        ['Nom', nameS],
        ['WhatsApp', prettyPhone(phoneS)],
        ['E-mail', emailS || '—'],
        ['Page à promouvoir', socialS],
        ["Domaine d'activité", domainS],
        ...(budgetS ? [['Budget marketing', budgetS] as [string, string]] : []),
        ['Message', msgTrimmed || '—'],
      ],
      ctas: [
        { label: 'Voir les réservations', url: `${req.nextUrl.origin}/admin/reservations` },
        ...(waLink(phoneS, `Bonjour ${nameS}, bien reçu votre demande de réservation (${frDate(dateS)} à ${slotS}) — je vous confirme rapidement !`)
          ? [{ label: 'Répondre sur WhatsApp', url: waLink(phoneS, `Bonjour ${nameS}, bien reçu votre demande de réservation (${frDate(dateS)} à ${slotS}) — je vous confirme rapidement !`) as string, secondary: true }]
          : []),
      ],
    });
  }
  void flushMailQueue().catch(() => {});

  // OpenAI Ads : conversion « lead » côté serveur (sans bloquer la réponse)
  const sourceUrl = req.headers.get('referer') || `${req.nextUrl.origin}/`;
  void sendLeadEvent({ id: leadEventId(id), sourceUrl });

  // lien WhatsApp de confirmation côté client (vers le numéro du site)
  const footer = site.page.sections.find((s) => s.type === 'footer');
  const waNumber = String(
    (booking.data as { whatsapp?: string })?.whatsapp ?? footer?.data?.whatsapp ?? '',
  );
  const lines = [
    'Bonjour, je souhaite confirmer ma réservation 📅',
    '',
    `• Nom : ${nameS}`,
    `• Service : ${String(service ?? '—')}`,
    `• Date : ${frDate(dateS)} à ${slotS}`,
    `• Téléphone : ${phoneS}`,
    `• Page : ${socialS}`,
    `• Domaine : ${domainS}`,
  ];
  if (budgetS) lines.push(`• Budget marketing : ${budgetS}`);
  if (emailS) lines.push(`• E-mail : ${emailS}`);
  const msgTrim = String(message ?? '').trim();
  if (msgTrim) lines.push(`• Message : ${msgTrim}`);
  lines.push('', 'Merci de me confirmer 🙏');
  const wa = waLink(waNumber, lines.join('\n'));
  return NextResponse.json({ ok: true, id, whatsapp: wa });
}
