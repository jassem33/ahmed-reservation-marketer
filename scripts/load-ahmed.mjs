/**
 * Charge le contenu réel d'Ahmed (site Canva d'origine) dans la base :
 * médias téléchargés depuis le site source et insérés dans Postgres,
 * document de page reconstruit avec ses textes, contacts et liens réels.
 * La version précédente est conservée dans l'historique (revisions).
 *
 * Usage : node scripts/load-ahmed.mjs
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

const BASE = 'https://testsejnane1.my.canva.site/ahmed-marketing-digital/';

const IMG = {
  portrait: '_assets/media/e89c6454f7fa6154c0c6c39645731d03.jpg',
  logo: '_assets/media/0ec86a68e3ce0aa1cfb20d9d8e8c05bd.png',
  siteJouhayra: '_assets/media/84e33565fc19223213a5ca959810976e.jpg',
  siteOdam: '_assets/media/bd05d7096e3283a0c5517fd09ba79242.jpg',
  siteNg: '_assets/media/5f431d784dd412c3ec18c7b8d289b752.jpg',
  siteDeco: '_assets/media/d200e0d6a8f993351cbb49c423884b10.jpg',
  proof1: '_assets/media/c62455f4a5f0dbfa63819ef2697312f6.png',
  proof2: '_assets/media/1f6f0baf221db0b7166d69e07d6b38a1.png',
  proof3: '_assets/media/132e03d7a009664d5d3101660e14175a.png',
  proof4: '_assets/media/8d1a922a0861b3eb2c03fd06064abd3f.jpg',
  avis1: '_assets/media/91415173a310654044cdbde82608cb54.jpg',
  avis2: '_assets/media/0a3c0100b75f4caaa98348d0bd194458.jpg',
  avis3: '_assets/media/0835703f047bfce45804c9c654c0b2ba.jpg',
  avis4: '_assets/media/ed19ac6fb85bd0a98afe99e1274986bc.jpg',
  avis5: '_assets/media/b4480cd63c9386132c3f848945ae162b.jpg',
  avis6: '_assets/media/5a913ef3eed676a4674f77c628da6ca3.jpg',
};

const VIDEOS = [
  '_assets/video/1848026eaf6d487c2f323c113265852d.mp4',
  '_assets/video/86660220686aed47708f18e82d15876a.mp4',
  '_assets/video/4b139016272950b00248b9d22ad96723.mp4',
  '_assets/video/6cbecb6b27c9252a37073a900283051e.mp4',
  '_assets/video/0ab7f47e37a004b51fa302ae2e9584a9.mp4',
  '_assets/video/c237c3f8af3e4df1d6471bb234e98566.mp4',
  '_assets/video/da5afd626f748c0df48da03a2fbc3407.mp4',
  '_assets/video/74556add56a786638823ab63473854ba.mp4',
  '_assets/video/614435f2f6150be576db9f46f87d6dfa.mp4',
  '_assets/video/5722156fd82b464285f6dd4574fa31c6.mp4',
  '_assets/video/50ca49bd1018f626a65bf259e4717f02.mp4',
  '_assets/video/c47460d7e0b7a617d1976723162c0998.mp4',
  '_assets/video/4f922d6e41396009d81f28aca3fefc53.mp4',
  '_assets/video/a78d31151d05f27a2d402e0043904e23.mp4',
  '_assets/video/caeea15621ab24fd9fc89c978647025f.mp4',
  '_assets/video/4f676c0d610bb4a873a264771e8a51c6.mp4',
  '_assets/video/5b8867735efb3975c6b26cb1121750ab.mp4',
  '_assets/video/eedaca47be087f57c04d7baf0c463660.mp4',
];

const MIME = { jpg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4', svg: 'image/svg+xml' };

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function importAsset(rel) {
  const url = BASE + rel;
  const name = rel.split('/').pop();
  const ext = name.split('.').pop();
  // évite les doublons si le script est relancé
  const dup = await pool.query('SELECT id FROM media WHERE filename = $1', [name]);
  if (dup.rows[0]) {
    console.log(`  = ${name} (déjà présent)`);
    return dup.rows[0].id;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement échoué ${res.status} : ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const r = await pool.query(
    'INSERT INTO media (filename, mime, size_bytes, data) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, MIME[ext] ?? 'application/octet-stream', buf.length, buf],
  );
  console.log(`  + ${name} (${(buf.length / 1024 / 1024).toFixed(1)} Mo)`);
  return r.rows[0].id;
}

console.log('Téléchargement des images…');
const img = {};
for (const [k, rel] of Object.entries(IMG)) img[k] = await importAsset(rel);

console.log('Téléchargement des 18 vidéos…');
const vid = [];
for (const rel of VIDEOS) vid.push(await importAsset(rel));

const T = (text, extra = {}) => ({ text, ...extra });
const image = (mediaId, alt = '') => ({ mediaId, alt });
const video = (mediaId) => ({ mediaId, posterId: null, caption: '' });

const mediaSection = (id, title, subtitle, ids) => ({
  id,
  type: 'media',
  style: { bg: id.endsWith('produits') ? 'var(--c-surface)' : 'var(--c-bg)', paddingY: 80, visible: true },
  data: { title: T(title), subtitle: T(subtitle), columns: 3, items: ids.map(video) },
});

const page = {
  sections: [
    {
      id: 'hero',
      type: 'hero',
      style: { bg: 'var(--c-bg)', paddingY: 88, visible: true },
      data: {
        handle: T('@ahmed_marketing_digital'),
        photo: image(img.portrait, 'Ahmed Amari à son bureau'),
        logo: image(img.logo, 'Logo Ahmed Ameri'),
        logoTitle: T('AHMED AMERI'),
        logoTagline: T('DIGITAL MARKETER'),
        titleTop: T('Salut à tous,\nmon nom est'),
        name: T('AHMED AMARI'),
        subtitle: T('Je suis expert en marketing digital — publicité Meta, contenu créatif et sites e-commerce.'),
      },
    },
    {
      id: 'services',
      type: 'services',
      style: { bg: 'var(--c-surface)', paddingY: 96, visible: true },
      data: {
        title: T('Nos services'),
        subtitle: T('Des solutions adaptées à vos besoins'),
        items: [
          {
            emoji: '📣',
            title: T('Sponsoring Meta Ads'),
            desc: T('Des campagnes sponsorisées Facebook & Instagram, calibrées selon vos objectifs.'),
          },
          {
            emoji: '🎬',
            title: T('Contenu professionnel'),
            desc: T('Nous tournons pour vous un contenu créatif, professionnel et efficace.'),
          },
          {
            emoji: '🌐',
            title: T('Site web'),
            desc: T("C'est votre droit d'avoir un site web qui développe votre projet."),
          },
          {
            emoji: '🚀',
            title: T('Pack « fais décoller ton projet »'),
            desc: T('Site web + sponsoring + création de contenu + branding : la formule complète.'),
          },
        ],
      },
    },
    mediaSection(
      'media-vetements',
      'Production créative : vêtements',
      'Voici un aperçu de ce que nous produisons pour nos clients',
      vid.slice(0, 6),
    ),
    mediaSection('media-produits', 'Production créative : produits', '', vid.slice(6, 12)),
    mediaSection('media-services', 'Production créative : services', '', vid.slice(12, 18)),
    {
      id: 'websites',
      type: 'websites',
      style: { bg: 'var(--c-surface)', paddingY: 96, visible: true },
      data: {
        title: T('🌐 Nos sites web réalisés'),
        buttonText: T('Découvrir ↗'),
        items: [
          { shot: image(img.siteJouhayra, 'Boutique jouhayra.tn'), name: T('jouhayra.tn'), url: 'https://jouhayra.tn' },
          { shot: image(img.siteOdam, 'Boutique odam.tn'), name: T('odam.tn'), url: 'https://odam.tn' },
          { shot: image(img.siteNg, 'Boutique NG Collection'), name: T('ng-collection.tn'), url: 'https://ng-collection.tn' },
          { shot: image(img.siteDeco, 'Boutique Déco Sanida'), name: T('deco-sanida.com'), url: 'https://deco-sanida.com' },
        ],
      },
    },
    {
      id: 'stats',
      type: 'stats',
      style: { bg: 'var(--c-bg)', paddingY: 96, visible: true },
      data: {
        title: T("Vos publicités méritent d'avoir de l'impact"),
        subtitle: T('Avec nos stratégies Meta Ads, vos objectifs deviennent des réussites mesurables.'),
        items: [
          { value: T('696 314 TND'), label: T('Revenus générés pour un client') },
          { value: T('18 872'), label: T('Commandes suivies') },
          { value: T('92,9 %'), label: T('Taux de livraison') },
          { value: T('0,78 $'), label: T('Coût par achat obtenu') },
        ],
        proofTitle: T('Extraits réels de nos tableaux de bord'),
        proof: [image(img.proof1), image(img.proof2), image(img.proof3), image(img.proof4)],
      },
    },
    {
      id: 'avis',
      type: 'testimonials',
      style: { bg: 'var(--c-surface)', paddingY: 96, visible: true },
      data: {
        title: T('⭐ Avis de nos clients'),
        items: [img.avis1, img.avis2, img.avis3, img.avis4, img.avis5, img.avis6].map((id) => ({
          image: image(id, 'Avis client (capture Facebook)'),
          quote: T(''),
          author: T(''),
        })),
      },
    },
    {
      id: 'footer',
      type: 'footer',
      style: { bg: 'var(--c-primary)', paddingY: 96, visible: true },
      data: {
        title: T('Prêt à booster vos résultats ?\nContactez-nous dès aujourd’hui !'),
        emailLabel: T('Adresse e-mail'),
        email: T('Ameriahmed167@gmail.com'),
        phoneLabel: T('Numéro de téléphone'),
        phone: T('+216 20 787 418'),
        whatsapp: '+21620787418',
        whatsappLabel: T('Discuter sur WhatsApp'),
        socialsLabel: T('Nos réseaux'),
        socials: [
          { kind: 'instagram', url: 'https://www.instagram.com/ahmed_ameri1?igsh=MTBmMTZ5cHRnOHpoYw==' },
          { kind: 'instagram', url: 'https://www.instagram.com/ahmed.am.marketing?igsh=MWd3ZmVyaG4zd2lrcg==' },
          { kind: 'tiktok', url: 'https://www.tiktok.com/@ahmedlgen?_r=1&_t=ZN-9317PObg0gg' },
          { kind: 'facebook', url: 'https://www.facebook.com/share/198UMhfLJi/' },
        ],
      },
    },
  ],
};

// thème : palette violette de l'audit, inchangée — seul le nom du site change
const current = await pool.query('SELECT theme, page FROM site WHERE id = 1');
const theme = current.rows[0]?.theme ?? JSON.parse(readFileSync(path.join(root, 'lib', 'default-site.json'), 'utf8')).theme;
theme.brand = {
  siteTitle: 'Ahmed Ameri — Digital Marketer',
  description:
    'Expert en marketing digital en Tunisie : publicité Meta, création de contenu et sites e-commerce.',
};

if (current.rows[0]) {
  await pool.query('INSERT INTO revisions (theme, page) VALUES ($1, $2)', [
    current.rows[0].theme,
    current.rows[0].page,
  ]);
}
await pool.query(
  `INSERT INTO site (id, theme, page) VALUES (1, $1, $2)
   ON CONFLICT (id) DO UPDATE SET theme = $1, page = $2, updated_at = now()`,
  [theme, page],
);

const stats = await pool.query(
  "SELECT count(*) AS n, pg_size_pretty(sum(size_bytes)::bigint) AS total FROM media",
);
console.log(`✓ Contenu d'Ahmed chargé. Médias en base : ${stats.rows[0].n} (${stats.rows[0].total}).`);
console.log("  L'ancienne version du site est restaurable via 🕘 Historique.");
await pool.end();
