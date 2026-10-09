// E-mails de réservation (confirmation, rappel) : contenu professionnel, bouton
// « Ajouter à Google Agenda » et invitation .ics avec rappel 24 h avant.
import { frDate } from './booking';
import { googleCalendarUrl, icsFile, type CalendarEvent } from './calendar';
import { brandedEmail, getMailConfig, queueMail, type MailAttachment } from './mail';
import { getSite } from './site';

export type ReservationRow = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  service: string | null;
  date: string; // YYYY-MM-DD
  slot: string; // HH:MM
};

const TZ = process.env.TZ || 'Africa/Tunis';
const SITE_URL = process.env.SITE_URL || 'https://ahmedmarketer.com';

async function context() {
  const site = await getSite();
  const booking = site.page.sections.find((s) => s.type === 'booking')?.data as
    | { slotMinutes?: number; whatsapp?: string }
    | undefined;
  const mail = await getMailConfig();
  return {
    siteTitle: site.theme.brand.siteTitle,
    accent: site.theme.colors.primary,
    slotMinutes: booking?.slotMinutes ?? 60,
    whatsapp: booking?.whatsapp ?? '',
    fromEmail: mail.from?.match(/<([^>]+)>/)?.[1] ?? mail.from,
  };
}

function calendarEvent(r: ReservationRow, siteTitle: string, slotMinutes: number): CalendarEvent {
  return {
    uid: `reservation-${r.id}@${new URL(SITE_URL).hostname}`,
    title: `${r.service ? `${r.service} — ` : ''}Rendez-vous avec ${siteTitle}`,
    description: `Rendez-vous ${r.service ? `« ${r.service} » ` : ''}avec ${siteTitle}.\nRéservé au nom de ${r.name}.\n${SITE_URL}`,
    location: SITE_URL,
    date: r.date,
    slot: r.slot,
    durationMinutes: slotMinutes,
    timeZone: TZ,
  };
}

function icsAttachment(ev: CalendarEvent, siteTitle: string, email?: string): MailAttachment {
  return {
    filename: 'rendez-vous.ics',
    content: icsFile(ev, { name: siteTitle, email }),
    contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
  };
}

/** Confirmation définitive (statut « confirmée ») : date, heure, agenda, rappel. */
export async function queueConfirmationMail(r: ReservationRow): Promise<void> {
  if (!r.email) return;
  const c = await context();
  const ev = calendarEvent(r, c.siteTitle, c.slotMinutes);
  await queueMail(
    r.email,
    `Rendez-vous confirmé — ${frDate(r.date)} à ${r.slot} · ${c.siteTitle}`,
    brandedEmail({
      siteTitle: c.siteTitle,
      accent: c.accent,
      title: 'Votre rendez-vous est confirmé ✅',
      intro: `Bonjour ${r.name},\nNous avons le plaisir de vous confirmer votre rendez-vous. Voici le récapitulatif :`,
      rows: [
        ['Service', r.service || '—'],
        ['Date', frDate(r.date)],
        ['Heure', `${r.slot} (heure de Tunis)`],
        ['Durée', `${c.slotMinutes} min`],
      ],
      ctas: [
        { label: '📅 Ajouter à Google Agenda', url: googleCalendarUrl(ev) },
      ],
      note:
        "Un fichier d'invitation (rendez-vous.ics) est joint à cet e-mail : ouvrez-le pour l'ajouter à Outlook, Apple Calendar ou Google Agenda avec un rappel automatique 24 h avant. Nous vous enverrons également un e-mail de rappel la veille.",
      outro:
        'Un empêchement ? Répondez simplement à cet e-mail ou contactez-nous sur WhatsApp pour déplacer votre rendez-vous.',
      signature: `À très bientôt,\nL'équipe ${c.siteTitle}`,
    }),
    [icsAttachment(ev, c.siteTitle, c.fromEmail)],
  );
}

/** Rappel envoyé la veille du rendez-vous. */
export async function queueReminderMail(r: ReservationRow): Promise<void> {
  if (!r.email) return;
  const c = await context();
  const ev = calendarEvent(r, c.siteTitle, c.slotMinutes);
  await queueMail(
    r.email,
    `Rappel : votre rendez-vous demain à ${r.slot} · ${c.siteTitle}`,
    brandedEmail({
      siteTitle: c.siteTitle,
      accent: c.accent,
      title: 'Rappel de votre rendez-vous 🔔',
      intro: `Bonjour ${r.name},\nPetit rappel : votre rendez-vous a lieu demain. Nous vous attendons !`,
      rows: [
        ['Service', r.service || '—'],
        ['Date', frDate(r.date)],
        ['Heure', `${r.slot} (heure de Tunis)`],
      ],
      ctas: [{ label: '📅 Ajouter à Google Agenda', url: googleCalendarUrl(ev) }],
      outro: 'Un empêchement de dernière minute ? Prévenez-nous en répondant à cet e-mail.',
      signature: `À demain,\nL'équipe ${c.siteTitle}`,
    }),
    [icsAttachment(ev, c.siteTitle, c.fromEmail)],
  );
}
