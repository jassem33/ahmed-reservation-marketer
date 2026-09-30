// Crée (ou remplace) la version arabe du site à partir de la version française :
// même mise en page, mêmes médias, textes traduits, polices arabes.
//   node scripts/translate-ar.mjs            → n'écrase pas une version arabe existante
//   node scripts/translate-ar.mjs --force    → remplace la version arabe
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  for (const line of readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {
  /* environnement */
}

const force = process.argv.includes('--force');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Traductions : texte français exact → arabe. Les textes non listés restent tels quels
// (noms propres, chiffres, adresses).
const T = {
  'Ahmed Ameri — Digital Marketer': 'أحمد العامري — خبير التسويق الرقمي',
  'Expert en marketing digital en Tunisie : publicité Meta, création de contenu et sites e-commerce.':
    'خبير في التسويق الرقمي في تونس: إعلانات ميتا، صناعة المحتوى ومواقع التجارة الإلكترونية.',
  'Réserver un créneau': 'احجز موعدًا',
  Services: 'خدماتنا',
  Portfolio: 'أعمالنا',
  'Sites web': 'مواقع الويب',
  Résultats: 'النتائج',
  Avis: 'آراء العملاء',
  Contact: 'اتصل بنا',
  Réserver: 'احجز',
  'Logo Ahmed Ameri': 'شعار أحمد العامري',
  'Ahmed Amari à son bureau': 'أحمد العامري في مكتبه',
  'Taux de livraison': 'نسبة التسليم',
  'Commandes suivies': 'طلبيات تمت متابعتها',
  'Je suis expert en marketing digital — publicité Meta, contenu créatif et sites e-commerce.':
    'أنا خبير في التسويق الرقمي — إعلانات ميتا، محتوى إبداعي ومواقع تجارة إلكترونية.',
  'Salut à tous,\nmon nom est': 'مرحبًا بالجميع،\nاسمي',
  'Discuter sur WhatsApp': 'تحدّث معنا على واتساب',
  'DIGITAL MARKETER': 'خبير تسويق رقمي',
  '• Meta Ads • Contenu créatif • Branding • ': '• إعلانات ميتا • محتوى إبداعي • هوية بصرية • ',
  'Voir nos réalisations': 'شاهد أعمالنا',
  'Décrivez ce service en une ou deux phrases.': 'صف هذه الخدمة في جملة أو جملتين.',
  Test: 'تجربة',
  "C'est votre droit d'avoir un site web qui développe votre projet.":
    'من حقك أن يكون لديك موقع ويب يطوّر مشروعك.',
  'Site web': 'موقع ويب',
  'Nous tournons pour vous un contenu créatif, professionnel et efficace.':
    'نصوّر لك محتوى إبداعيًا واحترافيًا وفعّالًا.',
  'Contenu professionnel': 'محتوى احترافي',
  'Site web + sponsoring + création de contenu + branding : la formule complète.':
    'موقع ويب + إعلانات ممولة + صناعة محتوى + هوية بصرية: الباقة الكاملة.',
  'Pack « fais décoller ton projet »': 'باقة « أطلق مشروعك »',
  'Nos services': 'خدماتنا',
  'Ce que nous faisons': 'ما نقوم به',
  'Des solutions adaptées à vos besoins': 'حلول مصمّمة حسب احتياجاتك',
  Vêtements: 'ملابس',
  'Notre production créative': 'إنتاجنا الإبداعي',
  'Voici un aperçu de ce que nous produisons pour nos clients': 'لمحة عمّا ننتجه لعملائنا',
  Produits: 'منتجات',
  'Logo NG Collection': 'شعار NG Collection',
  'Logo AURA': 'شعار AURA',
  'Logo Abbessi Prod': 'شعار Abbessi Prod',
  'Logo Euphoria Parfumerie': 'شعار Euphoria Parfumerie',
  'Logo AM Covering Garage': 'شعار AM Covering Garage',
  'Logo Zezoo Baby': 'شعار Zezoo Baby',
  'Logo Euro Store': 'شعار Euro Store',
  'Ils nous font confiance': 'يثقون بنا',
  Références: 'مراجعنا',
  'Les marques que nous accompagnons au quotidien.': 'العلامات التجارية التي نرافقها يوميًا.',
  'Boutique jouhayra.tn': 'متجر jouhayra.tn',
  'Boutique odam.tn': 'متجر odam.tn',
  'Boutique NG Collection': 'متجر NG Collection',
  'Boutique Déco Sanida': 'متجر Déco Sanida',
  'Nos sites web réalisés': 'مواقع الويب التي أنجزناها',
  Réalisations: 'إنجازاتنا',
  'Des boutiques en ligne rapides, élégantes et prêtes à convertir.':
    'متاجر إلكترونية سريعة وأنيقة وجاهزة لتحويل الزوار إلى عملاء.',
  'Découvrir ↗': 'اكتشف ↗',
  'Revenus générés pour un client': 'إيرادات حققناها لعميل واحد',
  '696 314 TND': '696 314 د.ت',
  'Coût par achat obtenu': 'تكلفة كل عملية شراء',
  "Vos publicités méritent d'avoir de l'impact": 'إعلاناتك تستحق أن تصنع الفرق',
  'Avec nos stratégies Meta Ads, vos objectifs deviennent des réussites mesurables.':
    'مع استراتيجياتنا في إعلانات ميتا، تتحوّل أهدافك إلى نجاحات قابلة للقياس.',
  'Extraits réels de nos tableaux de bord': 'لقطات حقيقية من لوحات التحكم الخاصة بنا',
  'Avis client (capture Facebook)': 'رأي عميل (لقطة من فيسبوك)',
  'Avis de nos clients': 'آراء عملائنا',
  Témoignages: 'شهادات',
  'Réservez votre créneau': 'احجز موعدك',
  'Prendre rendez-vous': 'حجز موعد',
  'Consultation gratuite en ligne': 'استشارة مجانية عبر الإنترنت',
  'Sponsoring Meta Ads': 'إعلانات ميتا الممولة',
  'Création de contenu': 'صناعة المحتوى',
  'Paiment sur place': 'الدفع في عين المكان',
  'Choisissez un service, une date et une heure — vous recevez une confirmation par e-mail et WhatsApp.':
    'اختر الخدمة والتاريخ والوقت — وستصلك رسالة تأكيد عبر البريد الإلكتروني وواتساب.',
  'Réserver ce créneau': 'احجز هذا الموعد',
  'Votre demande de réservation est bien enregistrée. Vous recevrez une confirmation par e-mail très rapidement.':
    'تم تسجيل طلب الحجز بنجاح. ستصلك رسالة تأكيد عبر البريد الإلكتروني في أقرب وقت.',
  'Demande envoyée !': 'تم إرسال الطلب!',
  'Confirmer sur WhatsApp': 'أكّد عبر واتساب',
  '© 2026 AHMED AMERI — Tous droits réservés.': '© 2026 أحمد العامري — جميع الحقوق محفوظة.',
  Navigation: 'روابط سريعة',
  'Moins de 500 DT / mois': 'أقل من 500 د.ت / شهريًا',
  '500 – 1 000 DT / mois': '500 – 1 000 د.ت / شهريًا',
  '1 000 – 3 000 DT / mois': '1 000 – 3 000 د.ت / شهريًا',
  'Plus de 3 000 DT / mois': 'أكثر من 3 000 د.ت / شهريًا',
  'À définir ensemble': 'نحدّدها معًا',
  // Textes propres au contenu en production
  'Produits (e-commerce) ': 'منتجات (تجارة إلكترونية) ',
  'Voici un aperçu de ce que nous produisons pour nos clients\n': 'لمحة عمّا ننتجه لعملائنا\n',
  'DES Vidéos montage + voix off': 'فيديوهات مونتاج + تعليق صوتي',
  'Notre production créativ': 'إنتاجنا الإبداعي',
  'Un aperçu de nos vidéos': 'لمحة عن فيديوهاتنا',
  'Logo client': 'شعار العميل',
  'Capture du site': 'لقطة من الموقع',
  'Revenus générés avec un client': 'إيرادات حققناها مع عميل واحد',
  'Commandes générés': 'طلبيات تم تحقيقها',
  '92,9 % de clients satisfaits': '92,9 % من العملاء راضون',
  'Consultation en ligne': 'استشارة عبر الإنترنت',
  'Choisissez un service, une date et une heure — vous recevez une confirmation par  WhatsApp.':
    'اختر الخدمة والتاريخ والوقت — وستصلك رسالة تأكيد عبر واتساب.',
  'E-commerce': 'تجارة إلكترونية',
  'Éducation / formation': 'تعليم / تكوين',
  Restauration: 'مطاعم',
  'Santé / bien-être': 'صحة / عافية',
  Immobilier: 'عقارات',
  'Mode & beauté': 'موضة وجمال',
  Autre: 'أخرى',
};

const TEXT_KEYS = new Set(['text', 'label', 'alt', 'caption', 'siteTitle', 'description']);
const missing = new Set();

function translate(o, key, parent) {
  if (Array.isArray(o)) return o.map((v) => translate(v, key, key));
  if (o && typeof o === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(o)) out[k] = translate(v, k, key);
    return out;
  }
  if (typeof o === 'string' && (TEXT_KEYS.has(key) || ['services', 'budgets', 'domains'].includes(parent))) {
    let out = o;
    if (T[o] !== undefined) out = T[o];
    else if (/[a-zàâçéèêëîïôûùüÿœ]{3,}/i.test(o)) missing.add(o);
    // Textes sans lettre arabe (« @handle », « 92,9 % », « 0,78 $ ») : on isole le
    // texte entier en écriture de gauche à droite (LRI … PDI) pour que l'algorithme
    // bidi n'en réordonne pas les morceaux. Valeurs mixtes (« 696 314 د.ت ») : on
    // isole seulement les nombres.
    const hasArabic = /[؀-ۿ]/.test(out);
    if (!hasArabic && /[A-Za-z0-9@]/.test(out) && !out.startsWith('\u2066')) {
      out = `⁦${out}⁩`;
    } else if (parent === 'value' && hasArabic) {
      out = out.replace(/\d[\d\s.,]*\d/g, (m) => `⁦${m}⁩`);
    }
    return out;
  }
  return o;
}

const { rows } = await pool.query("SELECT theme, page FROM site WHERE locale = 'fr'");
if (!rows[0]) throw new Error('Version française introuvable');
const existing = await pool.query("SELECT 1 FROM site WHERE locale = 'ar'");
if (existing.rows[0] && !force) {
  console.log('ℹ Une version arabe existe déjà — relancez avec --force pour la remplacer.');
  await pool.end();
  process.exit(0);
}

// seul le nom / la description du site sont traduits ; couleurs et réglages restent identiques
const theme = { ...rows[0].theme, brand: translate(rows[0].theme.brand, 'brand', 'theme') };
theme.fonts = { heading: 'cairo', body: 'tajawal' };
const page = translate(rows[0].page, '', '');
// le formulaire utilise ses budgets par défaut (en français) si la liste est absente
const booking = page.sections.find((s) => s.type === 'booking');
if (booking && !booking.data.budgets?.length) {
  booking.data.budgets = [
    'Moins de 500 DT / mois',
    '500 – 1 000 DT / mois',
    '1 000 – 3 000 DT / mois',
    'Plus de 3 000 DT / mois',
    'À définir ensemble',
  ].map((b) => T[b]);
}
if (booking && !booking.data.domains?.length) {
  booking.data.domains = [
    'E-commerce',
    'Éducation / formation',
    'Restauration',
    'Santé / bien-être',
    'Immobilier',
    'Mode & beauté',
    'Services',
    'Autre',
  ].map((b) => T[b] ?? b);
}

await pool.query(
  `INSERT INTO site (id, locale, theme, page) VALUES (1, 'ar', $1, $2)
   ON CONFLICT (locale) DO UPDATE SET theme = $1, page = $2, updated_at = now()`,
  [theme, page],
);
await pool.query("INSERT INTO revisions (theme, page, locale) VALUES ($1, $2, 'ar')", [theme, page]);
console.log('✓ Version arabe enregistrée (locale « ar »).');
if (missing.size) {
  console.log('⚠ Textes restés en français (non traduits) :');
  for (const m of missing) console.log('   -', JSON.stringify(m));
}
await pool.end();
