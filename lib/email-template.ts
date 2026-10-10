// Gabarit d'e-mail transactionnel : sobre, lisible partout (Gmail, Outlook,
// Apple Mail), aux couleurs et au logo du site. Tables + styles en ligne.
import type { SiteDoc } from './types';

export type EmailBrand = {
  siteTitle: string;
  /** Nom court affiché dans l'en-tête (marque de la barre de navigation). */
  brand: string;
  accent: string;
  /** URL absolue du logo (ou null : on affiche le nom en texte). */
  logoUrl: string | null;
  siteUrl: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
};

const SITE_URL = (process.env.SITE_URL || 'https://ahmedmarketer.com').replace(/\/$/, '');

/** Identité visuelle lue dans le document du site (modifiable par l'admin). */
export function emailBrand(site: SiteDoc): EmailBrand {
  const nav = site.page.nav;
  const hero = site.page.sections.find((s) => s.type === 'hero')?.data as
    | { logo?: { mediaId?: string | null } }
    | undefined;
  const footer = site.page.sections.find((s) => s.type === 'sitefooter')?.data as
    | { email?: { text?: string }; phone?: { text?: string } }
    | undefined;
  const booking = site.page.sections.find((s) => s.type === 'booking')?.data as
    | { whatsapp?: string }
    | undefined;
  const logoId = nav?.logoMediaId || hero?.logo?.mediaId || null;
  return {
    siteTitle: site.theme.brand.siteTitle,
    brand: nav?.brand || site.theme.brand.siteTitle,
    accent: site.theme.colors.primary || '#551ab2',
    logoUrl: logoId ? `${SITE_URL}/api/media/${logoId}` : null,
    siteUrl: SITE_URL,
    email: footer?.email?.text?.trim() || undefined,
    phone: footer?.phone?.text?.trim() || undefined,
    whatsapp: booking?.whatsapp?.trim() || undefined,
  };
}

export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const nl2br = (s: string) => esc(s).replace(/\n/g, '<br>');

export type EmailCta = { label: string; url: string; secondary?: boolean };

export type EmailContent = {
  /** Texte d'aperçu dans la boîte de réception (invisible dans le message). */
  preheader?: string;
  title: string;
  intro: string;
  /** Bloc mis en avant : la date / l'heure du rendez-vous. */
  highlight?: { label: string; value: string; detail?: string };
  rows?: Array<[string, string]>;
  ctas?: EmailCta[];
  note?: string;
  outro?: string;
  signature?: string;
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** HTML complet de l'e-mail. */
export function renderEmail(b: EmailBrand, c: EmailContent): string {
  const header = b.logoUrl
    ? `<img src="${esc(b.logoUrl)}" width="44" height="44" alt="${esc(b.brand)}" style="display:block;width:44px;height:44px;border-radius:10px;object-fit:cover;border:0">`
    : '';
  const highlight = c.highlight
    ? `<tr><td style="padding:0 0 26px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid ${b.accent};background:#f6f5fa;border-radius:0 12px 12px 0">
          <tr><td style="padding:16px 20px">
            <div style="font:600 11px/1.4 ${FONT};letter-spacing:1.2px;text-transform:uppercase;color:#7a7786">${esc(c.highlight.label)}</div>
            <div style="font:700 22px/1.3 ${FONT};color:#17161c;margin-top:4px">${esc(c.highlight.value)}</div>
            ${c.highlight.detail ? `<div style="font:400 14px/1.5 ${FONT};color:#5b5966;margin-top:2px">${esc(c.highlight.detail)}</div>` : ''}
          </td></tr>
        </table>
      </td></tr>`
    : '';
  const rows = c.rows?.length
    ? `<tr><td style="padding:0 0 26px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${c.rows
            .map(
              ([k, v], i) => `<tr>
            <td style="padding:10px 0;border-top:${i ? '1px solid #ecebf1' : '0'};font:400 13px/1.5 ${FONT};color:#7a7786;width:38%;vertical-align:top">${esc(k)}</td>
            <td style="padding:10px 0;border-top:${i ? '1px solid #ecebf1' : '0'};font:500 14px/1.5 ${FONT};color:#17161c;vertical-align:top;word-break:break-word">${esc(v)}</td>
          </tr>`,
            )
            .join('')}
        </table>
      </td></tr>`
    : '';
  const ctas = c.ctas?.length
    ? `<tr><td style="padding:0 0 22px">
        ${c.ctas
          .map((x) =>
            x.secondary
              ? `<a href="${esc(x.url)}" style="display:inline-block;margin:0 10px 10px 0;padding:11px 18px;border:1.5px solid #d9d7e2;border-radius:8px;font:600 14px/1 ${FONT};color:#17161c;text-decoration:none">${esc(x.label)}</a>`
              : `<a href="${esc(x.url)}" style="display:inline-block;margin:0 10px 10px 0;padding:12px 20px;background:${b.accent};border-radius:8px;font:600 14px/1 ${FONT};color:#ffffff;text-decoration:none">${esc(x.label)}</a>`,
          )
          .join('')}
      </td></tr>`
    : '';
  const contact = [
    b.phone ? esc(b.phone) : '',
    b.email ? `<a href="mailto:${esc(b.email)}" style="color:#7a7786;text-decoration:none">${esc(b.email)}</a>` : '',
    `<a href="${esc(b.siteUrl)}" style="color:#7a7786;text-decoration:none">${esc(b.siteUrl.replace(/^https?:\/\//, ''))}</a>`,
  ]
    .filter(Boolean)
    .join('&nbsp;&nbsp;·&nbsp;&nbsp;');

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(c.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f0f5">
${c.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f1f0f5">${esc(c.preheader)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f0f5">
<tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
    <tr><td style="padding:0 4px 18px">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        ${header ? `<td style="padding-right:12px;vertical-align:middle">${header}</td>` : ''}
        <td style="vertical-align:middle;font:700 15px/1 ${FONT};letter-spacing:1px;text-transform:uppercase;color:#17161c">${esc(b.brand)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border-radius:14px;padding:36px 36px 28px;border:1px solid #e6e4ee">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:0 0 10px;font:700 24px/1.25 ${FONT};color:#17161c;letter-spacing:-0.2px">${esc(c.title)}</td></tr>
        <tr><td style="padding:0 0 24px;font:400 15px/1.65 ${FONT};color:#4c4a57">${nl2br(c.intro)}</td></tr>
        ${highlight}
        ${rows}
        ${ctas}
        ${c.note ? `<tr><td style="padding:0 0 18px;font:400 13px/1.6 ${FONT};color:#8a8794">${nl2br(c.note)}</td></tr>` : ''}
        ${c.outro ? `<tr><td style="padding:14px 0 0;border-top:1px solid #ecebf1;font:400 14px/1.6 ${FONT};color:#4c4a57">${nl2br(c.outro)}</td></tr>` : ''}
        ${c.signature ? `<tr><td style="padding:18px 0 0;font:400 14px/1.6 ${FONT};color:#17161c">${nl2br(c.signature)}</td></tr>` : ''}
      </table>
    </td></tr>
    <tr><td style="padding:20px 8px 0;text-align:center;font:400 12px/1.7 ${FONT};color:#9896a3">
      ${esc(b.siteTitle)}<br>${contact}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Version texte brut (clients mail sans HTML, et meilleur score anti-spam). */
export function renderText(b: EmailBrand, c: EmailContent): string {
  const lines: string[] = [b.brand.toUpperCase(), '', c.title, '', c.intro, ''];
  if (c.highlight) lines.push(`${c.highlight.label} : ${c.highlight.value}${c.highlight.detail ? ` — ${c.highlight.detail}` : ''}`, '');
  for (const [k, v] of c.rows ?? []) lines.push(`${k} : ${v}`);
  if (c.rows?.length) lines.push('');
  for (const x of c.ctas ?? []) lines.push(`${x.label} : ${x.url}`);
  if (c.ctas?.length) lines.push('');
  if (c.note) lines.push(c.note, '');
  if (c.outro) lines.push(c.outro, '');
  if (c.signature) lines.push(c.signature, '');
  lines.push('--', b.siteTitle, [b.phone, b.email, b.siteUrl].filter(Boolean).join(' · '));
  return lines.join('\n');
}
