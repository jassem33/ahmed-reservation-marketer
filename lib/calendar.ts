// Invitations d'agenda pour une réservation : lien « Ajouter à Google Agenda »
// et fichier .ics (Outlook, Apple, Google) avec un rappel 24 h avant.

export type CalendarEvent = {
  uid: string;
  title: string;
  description: string;
  location?: string;
  date: string; // YYYY-MM-DD
  slot: string; // HH:MM
  durationMinutes: number;
  timeZone: string; // ex. Africa/Tunis
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Heure locale (dans timeZone) → instant UTC. */
function toUtc(date: string, slot: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = slot.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // décalage du fuseau à cet instant (approximation itérée une fois, suffisante hors changement d'heure)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((p) => [p.type, p.value]));
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
  return new Date(guess - (local - guess));
}

const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

export function eventWindow(ev: CalendarEvent): { start: Date; end: Date } {
  const start = toUtc(ev.date, ev.slot, ev.timeZone);
  return { start, end: new Date(start.getTime() + ev.durationMinutes * 60_000) };
}

/** Lien « Ajouter à Google Agenda » (le rappel suit les réglages de l'agenda de l'utilisateur). */
export function googleCalendarUrl(ev: CalendarEvent): string {
  const { start, end } = eventWindow(ev);
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: ev.description,
    ctz: ev.timeZone,
  });
  if (ev.location) q.set('location', ev.location);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const icsEsc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Fichier iCalendar avec une alarme 24 h avant le rendez-vous. */
export function icsFile(ev: CalendarEvent, organizer: { name: string; email?: string }): string {
  const { start, end } = eventWindow(ev);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${icsEsc(organizer.name)}//Reservation//FR`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${icsEsc(ev.title)}`,
    `DESCRIPTION:${icsEsc(ev.description)}`,
    ev.location ? `LOCATION:${icsEsc(ev.location)}` : '',
    organizer.email ? `ORGANIZER;CN=${icsEsc(organizer.name)}:mailto:${organizer.email}` : '',
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEsc(`Rappel : ${ev.title} demain à ${ev.slot}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  // RFC 5545 : lignes repliées à 75 octets, fin de ligne CRLF
  return lines
    .map((l) => {
      const out: string[] = [];
      let cur = l;
      while (Buffer.byteLength(cur) > 73) {
        let cut = 73;
        while (Buffer.byteLength(cur.slice(0, cut)) > 73) cut--;
        out.push(cur.slice(0, cut));
        cur = ` ${cur.slice(cut)}`;
      }
      out.push(cur);
      return out.join('\r\n');
    })
    .join('\r\n') + '\r\n';
}
