/** Tâches de fond au démarrage du serveur Next.js (environnement Node uniquement). */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startReminderLoop } = await import('./lib/reminders');
  startReminderLoop();
}
