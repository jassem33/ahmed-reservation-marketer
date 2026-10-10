// E-mails de réservation (accusé, confirmation, rappel, annulation) : contenu
// professionnel, logo et couleurs du site, bouton « Ajouter à Google Agenda »
// et invitation .ics avec rappel 24 h avant.
import { frDate, waLink } from './booking';
import { googleCalendarUrl, icsFile, type CalendarEvent } from './calendar';
import { emailBrand, getMailConfig, queueBrandedMail, type EmailBrand, type MailAttachment } from './mail';
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

type Ctx = { brand: EmailBrand; slotMinutes: number; fromEmail?: string; bookingUrl: string };

async function context(): Promise<Ctx> {
  const site = await getSite();
  const bookingSec = site.page.sections.find((s) => s.type === 'booking');
  const booking = bookingSec?.data as { slotMinutes?: number } | undefined;
  const mail = await getMailConfig();
  const brand = emailBrand(site);
  return {
    brand,
    slotMinutes: booking?.slotMinutes ?? 60,
    fromEmail: mail.from?.match(/<([^>]+)>/)?.[1] ?? mail.from,
    bookingUrl: bookingSec ? `${brand.siteUrl}/#sec-${bookingSec.id}` : brand.siteUrl,
  };
}

/** « mercredi 28 octobre 2026 » avec majuscule initiale. */
const dateLabel = (d: string) => {
  const s = frDate(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function calendarEvent(r: ReservationRow, c: Ctx): CalendarEvent {
  const { brand } = c;
  return {
    uid: `reservation-${r.id}@${new URL(brand.siteUrl).hostname}`,
    title: `${r.service ? `${r.service} — ` : ''}Rendez-vous avec ${brand.brand}`,
    description: `Rendez-vous ${r.service ? `« ${r.service} » ` : ''}avec ${brand.siteTitle}.\nRéservé au nom de ${r.name}.\n${brand.siteUrl}`,
    location: brand.siteUrl,
    date: r.date,
    slot: r.slot,
    durationMinutes: c.slotMinutes,
    timeZone: TZ,
  };
}

function icsAttachment(ev: CalendarEvent, c: Ctx): MailAttachment {
  return {
    filename: 'rendez-vous.ics',
    content: icsFile(ev, { name: c.brand.siteTitle, email: c.fromEmail }),
    contentType: 'text/calendar; charset=utf-8; method=PUBLISH',
  };
}

/** « +21620787418 » → « +216 20 787 418 » (numéros tunisiens), sinon tel quel. */
export const prettyPhone = (n: string): string => {
  const d = n.replace(/[^\d+]/g, '');
  const m = /^\+?216(\d{2})(\d{3})(\d{3})$/.exec(d);
  return m ? `+216 ${m[1]} ${m[2]} ${m[3]}` : n;
};

const contactOutro = (b: EmailBrand) => {
  const ways = [
    'en répondant à cet e-mail',
    b.whatsapp ? `sur WhatsApp au ${prettyPhone(b.whatsapp)}` : '',
  ].filter(Boolean);
  return `Un empêchement ou une question ? Contactez-nous ${ways.join(' ou ')}.`;
};

/** Accusé de réception, envoyé dès la demande (avant validation par l'admin). */
export async function queueReceiptMail(r: ReservationRow, extra: Array<[string, string]> = []): Promise<void> {
  if (!r.email) return;
  const c = await context();
  await queueBrandedMail(r.email, `Demande de rendez-vous reçue — ${dateLabel(r.date)} à ${r.slot}`, c.brand, {
    preheader: `Nous vérifions la disponibilité du ${dateLabel(r.date)} à ${r.slot} et revenons vers vous très vite.`,
    title: 'Votre demande est bien reçue',
    intro: `Bonjour ${r.name},\nMerci pour votre demande de rendez-vous. Nous vérifions la disponibilité et vous envoyons la confirmation définitive très rapidement, avec une invitation à ajouter à votre agenda.`,
    highlight: { label: 'Créneau demandé', value: `${dateLabel(r.date)} · ${r.slot}`, detail: r.service || undefined },
    rows: extra,
    outro: contactOutro(c.brand),
    signature: `À très bientôt,\n${c.brand.brand}`,
  });
}

/** Confirmation définitive (statut « confirmée ») : date, heure, agenda, rappel. */
export async function queueConfirmationMail(r: ReservationRow): Promise<void> {
  if (!r.email) return;
  const c = await context();
  const ev = calendarEvent(r, c);
  await queueBrandedMail(
    r.email,
    `Rendez-vous confirmé — ${dateLabel(r.date)} à ${r.slot}`,
    c.brand,
    {
      preheader: `C'est confirmé : ${dateLabel(r.date)} à ${r.slot}. Ajoutez-le à votre agenda en un clic.`,
      title: 'Votre rendez-vous est confirmé',
      intro: `Bonjour ${r.name},\nNous avons le plaisir de vous confirmer votre rendez-vous. Nous vous attendons.`,
      highlight: {
        label: 'Date et heure',
        value: `${dateLabel(r.date)} · ${r.slot}`,
        detail: `Durée ${c.slotMinutes} min · heure de Tunis`,
      },
      rows: [
        ['Service', r.service || '—'],
        ['Réservé au nom de', r.name],
      ],
      ctas: [
        { label: 'Ajouter à Google Agenda', url: googleCalendarUrl(ev) },
        ...(c.brand.whatsapp
          ? [{ label: 'Nous écrire sur WhatsApp', url: waLink(c.brand.whatsapp, `Bonjour, concernant mon rendez-vous du ${dateLabel(r.date)} à ${r.slot}`) ?? '', secondary: true }]
          : []),
      ].filter((x) => x.url),
      note: "L'invitation « rendez-vous.ics » jointe à cet e-mail fonctionne avec Outlook, Apple Calendar et Google Agenda ; elle contient un rappel automatique 24 h avant. Vous recevrez également un e-mail de rappel la veille.",
      outro: contactOutro(c.brand),
      signature: `À très bientôt,\n${c.brand.brand}`,
    },
    [icsAttachment(ev, c)],
  );
}

/** Rappel envoyé la veille du rendez-vous. */
export async function queueReminderMail(r: ReservationRow): Promise<void> {
  if (!r.email) return;
  const c = await context();
  const ev = calendarEvent(r, c);
  await queueBrandedMail(
    r.email,
    `Rappel — votre rendez-vous demain à ${r.slot}`,
    c.brand,
    {
      preheader: `À demain ${r.slot}. Tout est prêt de notre côté.`,
      title: 'Votre rendez-vous est demain',
      intro: `Bonjour ${r.name},\nPetit rappel : votre rendez-vous a lieu demain. Nous vous attendons.`,
      highlight: { label: 'Date et heure', value: `${dateLabel(r.date)} · ${r.slot}`, detail: r.service || undefined },
      ctas: [{ label: 'Ajouter à Google Agenda', url: googleCalendarUrl(ev) }],
      outro: contactOutro(c.brand),
      signature: `À demain,\n${c.brand.brand}`,
    },
    [icsAttachment(ev, c)],
  );
}

/** Annulation. */
export async function queueCancellationMail(r: ReservationRow): Promise<void> {
  if (!r.email) return;
  const c = await context();
  await queueBrandedMail(r.email, `Rendez-vous annulé — ${dateLabel(r.date)} à ${r.slot}`, c.brand, {
    title: 'Votre rendez-vous a été annulé',
    intro: `Bonjour ${r.name},\nVotre rendez-vous ci-dessous a été annulé. Vous pouvez en réserver un nouveau à tout moment sur notre site.`,
    highlight: { label: 'Rendez-vous annulé', value: `${dateLabel(r.date)} · ${r.slot}`, detail: r.service || undefined },
    ctas: [{ label: 'Réserver un nouveau créneau', url: c.bookingUrl }],
    outro: contactOutro(c.brand),
    signature: `Cordialement,\n${c.brand.brand}`,
  });
}
