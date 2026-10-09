// Rappels automatiques : un e-mail la veille de chaque rendez-vous confirmé.
// Appelé toutes les heures par instrumentation.ts (dès le démarrage du serveur).
import { pool } from './db';
import { flushMailQueue } from './mail';
import { queueReminderMail, type ReservationRow } from './reservation-mail';

const TZ = process.env.TZ || 'Africa/Tunis';

/** Réservations confirmées dont le rendez-vous est dans 0 à 24 h, pas encore rappelées. */
export async function sendDueReminders(): Promise<number> {
  const { rows } = await pool.query<ReservationRow>(
    `SELECT id, name, email, service, to_char(date, 'YYYY-MM-DD') AS date, slot
     FROM reservations
     WHERE status = 'confirmed' AND email <> '' AND reminded_at IS NULL
       AND ((date + slot::time) AT TIME ZONE $1) BETWEEN now() AND now() + interval '24 hours'
     ORDER BY date, slot`,
    [TZ],
  );
  for (const r of rows) {
    await queueReminderMail(r);
    await pool.query('UPDATE reservations SET reminded_at = now() WHERE id = $1', [r.id]);
  }
  if (rows.length) await flushMailQueue().catch(() => {});
  return rows.length;
}

const globalForTimer = globalThis as unknown as { wlReminderTimer?: NodeJS.Timeout };

/** Démarre la boucle horaire (une seule fois par processus). */
export function startReminderLoop(): void {
  if (globalForTimer.wlReminderTimer) return;
  const tick = () =>
    sendDueReminders()
      .then((n) => n && console.log(`[rappels] ${n} rappel(s) envoyé(s)`))
      .catch((e) => console.error('[rappels] échec :', e instanceof Error ? e.message : e));
  // premier passage après 30 s (laisse la base finir de démarrer), puis toutes les heures
  setTimeout(tick, 30_000);
  globalForTimer.wlReminderTimer = setInterval(tick, 60 * 60_000);
}
