/**
 * Migration de mise en page : ajoute la barre de navigation, les boutons
 * d'appel à l'action du héro, les badges flottants, le bandeau défilant,
 * les surtitres de sections, la disposition carrousel et le pied de page
 * au document déjà en base. Idempotent : ne remplace pas ce qui existe.
 * Usage : node scripts/upgrade-layout.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query('SELECT theme, page FROM site WHERE id = 1');
if (!rows[0]) {
  console.error('Aucun site en base — lancez d’abord npm run seed.');
  process.exit(1);
}
const { theme, page } = rows[0];
const secs = page.sections;
const byType = (t) => secs.filter((s) => s.type === t);
const hero = byType('hero')[0];
const footerCta = byType('footer')[0];
const T = (text) => ({ text });

// ---------- Barre de navigation ----------
if (!page.nav) {
  const links = [];
  const add = (sec, label) => sec && links.push({ label, href: `#sec-${sec.id}` });
  add(byType('services')[0], 'Services');
  add(byType('media')[0], 'Portfolio');
  add(byType('websites')[0], 'Sites web');
  add(byType('stats')[0], 'Résultats');
  add(byType('testimonials')[0], 'Avis');
  add(footerCta, 'Contact');
  page.nav = {
    enabled: true,
    brand: hero?.data?.logoTitle?.text || 'VOTRE MARQUE',
    logoMediaId: hero?.data?.logo?.mediaId ?? null,
    links,
    cta: {
      label: 'Contactez-nous',
      url: footerCta ? `#sec-${footerCta.id}` : '#top',
      enabled: true,
    },
  };
  console.log('+ barre de navigation');
}

// ---------- Héro : CTA, badges, bandeau ----------
if (hero) {
  const d = hero.data;
  const wa = String(footerCta?.data?.whatsapp || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  const firstMedia = byType('media')[0];
  d.ctaPrimary ??= {
    label: T('Discuter sur WhatsApp'),
    url: wa ? `https://wa.me/${wa}` : '#sec-' + (footerCta?.id ?? 'footer'),
    enabled: true,
  };
  d.ctaSecondary ??= {
    label: T('Voir nos réalisations'),
    url: firstMedia ? `#sec-${firstMedia.id}` : '#top',
    enabled: true,
  };
  const stats = byType('stats')[0]?.data?.items ?? [];
  d.badges ??= [
    stats[2] ? { value: T(stats[2].value.text), label: T(stats[2].label.text) } : { value: T('+250%'), label: T('ROAS moyen') },
    stats[1] ? { value: T(stats[1].value.text), label: T(stats[1].label.text) } : { value: T('5 ans'), label: T("d'expérience") },
  ];
  if (!d.marqueeText) {
    const names = (byType('websites')[0]?.data?.items ?? []).map((it) => it.name?.text).filter(Boolean);
    d.marqueeText = T([...names, 'Meta Ads', 'Contenu créatif', 'Branding'].join(' • ') + ' • ');
  }
  console.log('+ héro : boutons, badges, bandeau défilant');
}

// ---------- Surtitres + disposition ----------
const mediaSecs = byType('media');
mediaSecs.forEach((s, k) => {
  s.data.layout ??= 'carousel';
  if (!s.data.eyebrow) {
    s.data.eyebrow = T('Notre production créative');
    const t = s.data.title?.text ?? '';
    const m = /:\s*(.+)$/.exec(t);
    if (m) s.data.title.text = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    if (k > 0 && s.data.subtitle) s.data.subtitle.text = s.data.subtitle.text || '';
  }
});
const eyebrows = {
  services: 'Ce que nous faisons',
  websites: 'Réalisations',
  stats: 'Résultats',
  testimonials: 'Témoignages',
};
for (const [type, text] of Object.entries(eyebrows)) {
  for (const s of byType(type)) s.data.eyebrow ??= T(text);
}
for (const s of byType('websites')) {
  s.data.layout ??= 'carousel';
  s.data.subtitle ??= T('Des boutiques en ligne rapides, élégantes et prêtes à convertir.');
  if (s.data.title?.text?.startsWith('🌐 ')) s.data.title.text = s.data.title.text.slice(2).trim();
}
for (const s of byType('testimonials')) {
  s.data.subtitle ??= T('');
  if (s.data.title?.text?.startsWith('⭐ ')) s.data.title.text = s.data.title.text.slice(1).trim();
}
if (footerCta) footerCta.data.fabEnabled ??= true;
console.log('+ surtitres, carrousels, bouton flottant');

// ---------- Pied de page ----------
if (!byType('sitefooter').length) {
  secs.push({
    id: 'sitefooter',
    type: 'sitefooter',
    style: { bg: '#0a0a0d', paddingY: 64, visible: true },
    data: {
      brand: T(page.nav.brand),
      about: T(theme.brand?.description || 'Votre partenaire marketing digital.'),
      linksTitle: T('Navigation'),
      links: page.nav.links.map((l) => ({ ...l })),
      contactTitle: T('Contact'),
      email: T(footerCta?.data?.email?.text || 'contact@exemple.com'),
      phone: T(footerCta?.data?.phone?.text || ''),
      socials: (footerCta?.data?.socials ?? []).map((s) => ({ ...s })),
      legal: T(`© ${new Date().getFullYear()} ${page.nav.brand} — Tous droits réservés.`),
    },
  });
  console.log('+ pied de page');
}

await pool.query('INSERT INTO revisions (theme, page) VALUES ($1, $2)', [theme, page]);
await pool.query('UPDATE site SET page = $1, updated_at = now() WHERE id = 1', [page]);
console.log('✓ Migration appliquée (ancienne version dans l’historique).');
await pool.end();
