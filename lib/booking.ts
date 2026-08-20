export type DaySchedule = { on: boolean; start: string; end: string };

/** Exception pour une date précise : journée fermée, horaires modifiés,
 *  ou liste de créneaux choisis à la main. */
export type DateOverride = {
  date: string; // YYYY-MM-DD
  mode: 'closed' | 'custom';
  start?: string;
  end?: string;
  /** Si renseigné, ces heures exactes remplacent la génération automatique. */
  slots?: string[];
};

export type BookingConfig = {
  slotMinutes: number;
  daysAhead: number;
  minNoticeHours: number;
  /** Indexé comme Date.getDay() : 0 = dimanche … 6 = samedi */
  schedule: DaySchedule[];
  overrides?: DateOverride[];
};

export const DEFAULT_BOOKING_CONFIG: BookingConfig = {
  slotMinutes: 60,
  daysAhead: 30,
  minNoticeHours: 12,
  schedule: [
    { on: false, start: '09:00', end: '18:00' }, // dimanche
    { on: true, start: '09:00', end: '18:00' },
    { on: true, start: '09:00', end: '18:00' },
    { on: true, start: '09:00', end: '18:00' },
    { on: true, start: '09:00', end: '18:00' },
    { on: true, start: '09:00', end: '18:00' },
    { on: true, start: '09:00', end: '13:00' }, // samedi
  ],
};

/** Tranches de budget marketing proposées par défaut (modifiables dans l'éditeur). */
export const DEFAULT_BUDGETS = [
  'Moins de 500 DT / mois',
  '500 – 1 000 DT / mois',
  '1 000 – 3 000 DT / mois',
  'Plus de 3 000 DT / mois',
  'À définir ensemble',
];

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const toHHMM = (min: number): string =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export const isValidDateStr = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);
export const isValidSlot = (s: string): boolean => /^\d{2}:\d{2}$/.test(s);

/** Génère la grille d'heures entre deux bornes, au pas demandé. */
export function generateSlots(start: string, end: string, stepMinutes: number): string[] {
  const step = Math.max(5, stepMinutes || 60);
  const out: string[] = [];
  for (let m = toMin(start); m + step <= toMin(end); m += step) out.push(toHHMM(m));
  return out;
}

/** Créneaux libres pour une date donnée : exceptions de date (fermée,
 *  horaires modifiés ou créneaux à la carte) puis planning hebdomadaire,
 *  moins le préavis minimum et les créneaux déjà réservés. */
export function slotsForDate(
  cfg: BookingConfig,
  dateStr: string,
  booked: string[],
  now: Date = new Date(),
): string[] {
  if (!isValidDateStr(dateStr)) return [];
  const date = new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime())) return [];
  // borne haute : daysAhead jours
  const max = new Date(now);
  max.setDate(max.getDate() + (cfg.daysAhead || 30));
  if (date > max) return [];

  const override = cfg.overrides?.find((o) => o.date === dateStr);
  let candidates: string[];
  if (override?.mode === 'closed') return [];
  if (override?.mode === 'custom') {
    candidates = override.slots?.length
      ? [...override.slots].filter(isValidSlot).sort()
      : generateSlots(override.start ?? '09:00', override.end ?? '18:00', cfg.slotMinutes);
  } else {
    const sched = cfg.schedule?.[date.getDay()];
    if (!sched?.on) return [];
    candidates = generateSlots(sched.start, sched.end, cfg.slotMinutes);
  }

  return candidates.filter((slot) => {
    const slotDate = new Date(`${dateStr}T${slot}:00`);
    if (slotDate.getTime() - now.getTime() < (cfg.minNoticeHours || 0) * 3_600_000) return false;
    return !booked.includes(slot);
  });
}

export function bookingConfigFrom(data: Record<string, unknown> | undefined): BookingConfig {
  const d = (data ?? {}) as Partial<BookingConfig>;
  return {
    slotMinutes: d.slotMinutes ?? DEFAULT_BOOKING_CONFIG.slotMinutes,
    daysAhead: d.daysAhead ?? DEFAULT_BOOKING_CONFIG.daysAhead,
    minNoticeHours: d.minNoticeHours ?? DEFAULT_BOOKING_CONFIG.minNoticeHours,
    schedule:
      Array.isArray(d.schedule) && d.schedule.length === 7
        ? (d.schedule as DaySchedule[])
        : DEFAULT_BOOKING_CONFIG.schedule,
    overrides: Array.isArray(d.overrides) ? (d.overrides as DateOverride[]) : [],
  };
}

export const frDate = (dateStr: string): string =>
  new Date(`${dateStr}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const waNumber = (raw: string): string => raw.replace(/[^\d+]/g, '').replace(/^\+/, '');

export function waLink(rawNumber: string, text: string): string | null {
  const n = waNumber(rawNumber || '');
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
}
