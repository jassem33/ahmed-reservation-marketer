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

export async function getMailConfig(): Promise<Partial<MailConfig>> {
  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'mail'");
  return (rows[0]?.value as Partial<MailConfig>) ?? {};
}

export async function saveMailConfig(cfg: Partial<MailConfig>): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ('mail', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [cfg],
  );
}

export const mailReady = (cfg: Partial<MailConfig>): boolean => !!(cfg.host && cfg.from);

/** Ajoute un e-mail à la file (il partira dès que le SMTP est configuré). */
export async function queueMail(to: string, subject: string, html: string): Promise<void> {
  await pool.query('INSERT INTO mail_queue (to_email, subject, html) VALUES ($1, $2, $3)', [
    to,
    subject,
    html,
  ]);
}

/** Tente d'envoyer tous les e-mails en attente. Sans configuration SMTP,
 *  ne fait rien (la file reste en base). */
export async function flushMailQueue(): Promise<{ sent: number; failed: number; left: number }> {
  const cfg = await getMailConfig();
  if (!mailReady(cfg)) {
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM mail_queue WHERE status = 'queued'");
    return { sent: 0, failed: 0, left: rows[0].n };
  }
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port ?? 465,
    secure: cfg.secure ?? true,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  const { rows } = await pool.query(
    "SELECT id, to_email, subject, html FROM mail_queue WHERE status = 'queued' ORDER BY id LIMIT 25",
  );
  let sent = 0;
  let failed = 0;
  for (const m of rows) {
    try {
      await transport.sendMail({ from: cfg.from, to: m.to_email, subject: m.subject, html: m.html });
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
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<p style="margin:26px 0 0"><a href="${opts.ctaUrl}" style="background:${opts.accent};color:#fff;text-decoration:none;padding:12px 26px;border-radius:999px;font-size:14px;font-weight:600;display:inline-block">${esc(opts.ctaLabel)}</a></p>`
      : '';
  return `<!doctype html><html><body style="margin:0;background:#f2f2f6;padding:28px 12px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
      <tr><td style="background:${opts.accent};border-radius:16px 16px 0 0;padding:22px 30px">
        <div style="color:#fff;font-size:17px;font-weight:800;letter-spacing:1px;text-transform:uppercase">${esc(opts.siteTitle)}</div>
      </td></tr>
      <tr><td style="background:#ffffff;border-radius:0 0 16px 16px;padding:30px">
        <h1 style="margin:0 0 12px;font-size:21px;color:#16161a">${esc(opts.title)}</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:#4a4a55">${esc(opts.intro)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="background:#f7f7fa;border-radius:12px;width:100%">${rows}</table>
        ${opts.outro ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#6b6b76">${esc(opts.outro)}</p>` : ''}
        ${cta}
      </td></tr>
      <tr><td style="padding:16px 8px;text-align:center;color:#9a9aa6;font-size:11px">${esc(opts.siteTitle)}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
