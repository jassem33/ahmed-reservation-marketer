import nodemailer from 'nodemailer';
import { pool } from './db';

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
): Promise<void> {
  await pool.query(
    'INSERT INTO mail_queue (to_email, subject, html, attachments) VALUES ($1, $2, $3, $4)',
    [to, subject, html, JSON.stringify(attachments)],
  );
}

/** Tente d'envoyer tous les e-mails en attente. Sans configuration SMTP,
 *  ne fait rien (la file reste en base). Les e-mails en attente depuis plus de
 *  7 jours sont abandonnés : un accusé de réception tardif serait trompeur. */
export async function flushMailQueue(): Promise<{ sent: number; failed: number; left: number }> {
  const cfg = await getMailConfig();
  if (!mailReady(cfg)) {
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM mail_queue WHERE status = 'queued'");
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
  });
  const { rows } = await pool.query(
    "SELECT id, to_email, subject, html, attachments FROM mail_queue WHERE status = 'queued' ORDER BY id LIMIT 25",
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
        attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
      });
      await pool.query("UPDATE mail_queue SET status = 'sent', sent_at = now(), error = NULL WHERE id = $1", [m.id]);
      sent++;
    } catch (e) {
      failed++;
      await pool.query("UPDATE mail_queue SET status = 'error', error = $2 WHERE id = $1", [
        m.id,
        e instanceof Error ? e.message.slice(0, 500) : 'erreur inconnue',
      ]);
    }
  }
  const left = await pool.query("SELECT count(*)::int AS n FROM mail_queue WHERE status = 'queued'");
  return { sent, failed, left: left.rows[0].n };
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export type EmailCta = { label: string; url: string; secondary?: boolean };

/** Gabarit d'e-mail HTML aux couleurs du site. */
export function brandedEmail(opts: {
  siteTitle: string;
  accent: string;
  title: string;
  intro: string;
  rows: Array<[string, string]>;
  outro?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Boutons supplémentaires (ex. « Ajouter à Google Agenda »). */
  ctas?: EmailCta[];
  /** Petit texte sous les boutons (ex. mention du rappel 24 h). */
  note?: string;
  signature?: string;
}): string {
  const rows = opts.rows
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:8px 14px;color:#6b6b76;font-size:13px;white-space:nowrap">${esc(k)}</td>
        <td style="padding:8px 14px;color:#16161a;font-size:14px;font-weight:600">${esc(v)}</td>
      </tr>`,
    )
    .join('');
  const ctas: EmailCta[] = [
    ...(opts.ctaLabel && opts.ctaUrl ? [{ label: opts.ctaLabel, url: opts.ctaUrl }] : []),
    ...(opts.ctas ?? []),
  ];
  const buttons = ctas.length
    ? `<p style="margin:26px 0 0">${ctas
        .map((c) =>
          c.secondary
            ? `<a href="${c.url}" style="color:${opts.accent};border:2px solid ${opts.accent};text-decoration:none;padding:10px 22px;border-radius:999px;font-size:14px;font-weight:600;display:inline-block;margin:0 8px 8px 0">${esc(c.label)}</a>`
            : `<a href="${c.url}" style="background:${opts.accent};color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-size:14px;font-weight:600;display:inline-block;margin:0 8px 8px 0">${esc(c.label)}</a>`,
        )
        .join('')}</p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#f2f2f6;padding:28px 12px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr><td style="background:${opts.accent};border-radius:16px 16px 0 0;padding:22px 30px">
        <div style="color:#fff;font-size:17px;font-weight:800;letter-spacing:1px;text-transform:uppercase">${esc(opts.siteTitle)}</div>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;padding:30px">
        <h1 style="margin:0 0 12px;font-size:21px;color:#16161a">${esc(opts.title)}</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#4a4a55">${esc(opts.intro).replace(/\n/g, '<br>')}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:#f7f7fa;border-radius:12px;width:100%">${rows}</table>
        ${buttons}
        ${opts.note ? `<p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#8a8a97">${esc(opts.note)}</p>` : ''}
        ${opts.outro ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6b6b76">${esc(opts.outro)}</p>` : ''}
        ${opts.signature ? `<p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#4a4a55">${esc(opts.signature).replace(/\n/g, '<br>')}</p>` : ''}
      </td></tr>
      <tr><td style="padding:16px 8px;text-align:center;color:#9a9aa6;font-size:11px">${esc(opts.siteTitle)}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
