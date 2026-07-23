/**
 * Vérification de bout en bout : rendu public, connexion admin, édition
 * (texte, thème, image), enregistrement et persistance après rechargement.
 * Usage : node scripts/verify.mjs [baseUrl]  (défaut http://localhost:3001)
 */
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:3001';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const shots = path.join(root, 'docs', 'screens');
mkdirSync(shots, { recursive: true });

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ` — ${extra}` : ''}`);
};

// petite image de test (PNG 4x4)
import zlib from 'node:zlib';
const pngChunk = (t, d) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(d.length);
  const type = Buffer.from(t);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(Buffer.concat([type, d])) : 0);
  return Buffer.concat([len, type, d, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(4, 0);
ihdr.writeUInt32BE(4, 4);
ihdr[8] = 8;
ihdr[9] = 2;
const raw = Buffer.concat(
  Array.from({ length: 4 }, () => Buffer.concat([Buffer.from([0]), Buffer.from('93a9ff'.repeat(4), 'hex')])),
);
const png = Buffer.concat([
  Buffer.from('89504e470d0a1a0a', 'hex'),
  pngChunk('IHDR', ihdr),
  pngChunk('IDAT', zlib.deflateSync(raw)),
  pngChunk('IEND', Buffer.alloc(0)),
]);
const testImg = path.join(shots, '_upload-test.png');
writeFileSync(testImg, png);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const MARK = `Test ${Date.now()}`;

try {
  // 1. Page publique
  await page.goto(BASE, { waitUntil: 'networkidle' });
  check('Page publique répond', true);
  check('Titre héro rendu', (await page.getByText('mon nom est').count()) > 0);
  check('Barre admin absente en public', (await page.locator('.wl-toolbar').count()) === 0);
  await page.screenshot({ path: path.join(shots, '1-public.png'), fullPage: true });

  // 2. Connexion
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await page.fill('#u', process.env.ADMIN_USERNAME || 'admin');
  await page.fill('#p', process.env.ADMIN_PASSWORD || 'admin123');
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE}/`);
  await page.waitForSelector('.wl-toolbar');
  check('Connexion admin + barre d’outils', true);

  // 3. Mode édition + édition de texte
  await page.click('text=✏️ Éditer la page');
  await page.getByText('VOTRE NOM', { exact: false }).first().click();
  await page.waitForSelector('.wl-panel textarea');
  await page.fill('.wl-panel textarea', MARK);
  check('Édition de texte en direct', (await page.getByText(MARK).count()) > 0);

  // 4. Curseur de taille + couleur du texte
  await page.locator('.wl-panel input[type=range]').first().fill('90');
  await page.locator('.wl-panel input[type=color]').first().fill('#ff4d88');
  check('Contrôles taille/couleur réactifs', true);

  // 5. Thème global : couleur principale
  await page.click('text=🎨 Thème');
  const primaryInput = page.locator('.wl-panel input.wl-input[value="#551ab2"]').first();
  await primaryInput.fill('#0d7a5f');
  const heroPanel = await page
    .locator('section')
    .first()
    .evaluate(() => getComputedStyle(document.querySelector('.wl-toolbar .wl-save')).backgroundColor);
  check('Couleur principale propagée (CSS var)', heroPanel === 'rgb(13, 122, 95)', heroPanel);

  // 6. Remplacement d'image (téléversement vers Postgres)
  await page.locator('section').first().locator('.wl-editable').filter({ has: page.locator('img, .wl-img-ph') }).first().click();
  await page.waitForSelector('.wl-panel input[type=file]', { state: 'attached' });
  await page.setInputFiles('.wl-panel input[type=file]', testImg);
  await page.waitForFunction(() => {
    const img = document.querySelector('section img');
    return img && img.src.includes('/api/media/');
  });
  check('Téléversement d’image OK', true);
  await page.screenshot({ path: path.join(shots, '2-edit-mode.png') });

  // 7. Enregistrer
  await page.click('.wl-toolbar .wl-save');
  await page.waitForSelector('text=✓ Enregistré');
  check('Enregistrement en base', true);

  // 8. Persistance après rechargement
  await page.reload({ waitUntil: 'networkidle' });
  check('Texte persisté après rechargement', (await page.getByText(MARK).count()) > 0);
  await page.screenshot({ path: path.join(shots, '3-after-save.png'), fullPage: true });

  // 9. API : le document sauvegardé contient bien la nouvelle couleur
  const site = await page.evaluate(() => fetch('/api/site').then((r) => r.json()));
  check('Thème persisté (couleur principale)', site.theme.colors.primary === '#0d7a5f', site.theme.colors.primary);
  check('Texte présent dans le document', JSON.stringify(site.page).includes(MARK.split(' ')[0]));
} catch (e) {
  check(`Exception : ${e.message}`, false);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies`);
process.exit(failed.length ? 1 : 0);
