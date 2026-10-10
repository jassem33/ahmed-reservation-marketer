import nodemailer from 'nodemailer';
import { pool } from './db';
import { renderEmail, renderText, type EmailBrand, type EmailContent } from './email-template';

export type { EmailBrand, EmailContent, EmailCta } from './email-template';
export { emailBrand } from './email-template';

export type MailConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  adminEmail: string;
};

/** Valeurs de secours lues dans l'environnement (.env) quand le panneau admin est vide. */
function envMailConfig(): Partial<MailConfig> {
  const e = process.env;
  const cfg: Partial<MailConfig> = {};
  if (e.MAIL_HOST) cfg.host = e.MAIL_HOST;
  if (e.MAIL_PORT) cfg.port = Number(e.MAIL_PORT) || undefined;
  if (e.MAIL_SECURE) cfg.secure = e.MAIL_SECURE !== 'false' && e.MAIL_SECURE !== '0';
  if (e.MAIL_USER) cfg.user = e.MAIL_USER;
  if (e.MAIL_PASS) cfg.pass = e.MAIL_PASS;
  if (e.MAIL_FROM) cfg.from = e.MAIL_FROM;
  if (e.ADMIN_EMAIL) cfg.adminEmail = e.ADMIN_EMAIL;
  return cfg;
}

/** Configuration effective : panneau admin (table settings), champ par champ, sinon .env. */
export async function getMailConfig(): Promise<Partial<MailConfig>> {
  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'mail'");
  const saved = (rows[0]?.value as Partial<MailConfig>) ?? {};
  const env = envMailConfig();
  const pick = <K extends keyof MailConfig>(k: K): MailConfig[K] | undefined => {
    const v = saved[k];
    return v === undefined || v === '' ? env[k] : v;
  };
  return {
    host: pick('host'),
    port: pick('port'),
    secure: saved.host ? saved.secure : env.secure,
    user: pick('user'),
    pass: pick('pass'),
    from: pick('from'),
    adminEmail: pick('adminEmail'),
  };
}

export async function saveMailConfig(cfg: Partial<MailConfig>): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('mail', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [cfg],
  );
}

/** Prêt à envoyer : serveur + expéditeur, et mot de passe présent dès qu'un identifiant est donné
 *  (sans cela les e-mails partiraient en erreur définitive au lieu d'attendre). */
export const mailReady = (cfg: Partial<MailConfig>): boolean =>
  !!(cfg.host && cfg.from) && (!cfg.user || !!cfg.pass);

export type MailAttachment = { filename: string; content: string; contentType: string };

/** Ajoute un e-mail à la file (il partira dès que le SMTP est configuré). */
export async function queueMail(
  to: string,
  subject: string,
  html: string,
  attachments: MailAttachment[] = [],
  text = '',
): Promise<void> {
  await pool.query(
    'INSERT INTO mail_queue (to_email, subject, html, attachments, text) VALUES ($1, $2, $3, $4, $5)',
    [to, subject, html, JSON.stringify(attachments), text],
  );
}

/** Compose (HTML + texte) et met en file un e-mail aux couleurs du site. */
export async function queueBrandedMail(
  to: string,
  subject: string,
  brand: EmailBrand,
  content: EmailContent,
  attachments: MailAttachment[] = [],
): Promise<void> {
  await queueMail(to, subject, renderEmail(brand, content), attachments, renderText(brand, content));
}

/** Tente d'envoyer tous les e-mails en attente. Sans configuration SMTP,
 *  ne fait rien (la file reste en base). Les e-mails en attente depuis plus de
 *  7 jours sont abandonnés : un accusé de réception tardif serait trompeur. */
export async function flushMailQueue(): Promise<{ sent: number; failed: number; left: number }> {
  const cfg = await getMailConfig();
  if (!mailReady(cfg)) {
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM mail_queue WHERE status = 'queued'");
    if (rows[0].n > 0) console.warn(`[mail] SMTP non configuré : ${rows[0].n} e-mail(s) en attente`);
    return { sent: 0, failed: 0, left: rows[0].n };
  }
  await pool.query(
    `UPDATE mail_queue SET status = 'error', error = 'Expiré : en attente depuis plus de 7 jours'
     WHERE status = 'queued' AND created_at < now() - interval '7 days'`,
  );
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port ?? 465,
    secure: cfg.secure ?? true,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  const { rows } = await pool.query(
    "SELECT id, to_email, subject, html, text, attachments FROM mail_queue WHERE status = 'queued' ORDER BY id LIMIT 25",
  );
  let sent = 0;
  let failed = 0;
  for (const m of rows) {
    try {
      const attachments = (Array.isArray(m.attachments) ? m.attachments : []) as MailAttachment[];
      await transport.sendMail({
        from: cfg.from,
        to: m.to_email,
        subject: m.subject,
        html: m.html,
        text: m.text || undefined,
        attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
      });
      await pool.query("UPDATE mail_queue SET status = 'sent', sent_at = now(), error = NULL WHERE id = $1", [m.id]);
      sent++;
    } catch (e) {
      failed++;
      console.error(`[mail] envoi #${m.id} vers ${m.to_email} échoué :`, e instanceof Error ? e.message : e);
      await pool.query("UPDATE mail_queue SET status = 'error', error = $2 WHERE id = $1", [
        m.id,
        e instanceof Error ? e.message.slice(0, 500) : 'erreur inconnue',
      ]);
    }
  }
  const left = await pool.query("SELECT count(*)::int AS n FROM mail_queue WHERE status = 'queued'");
  return { sent, failed, left: left.rows[0].n };
}
