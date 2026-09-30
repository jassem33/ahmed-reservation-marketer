import type { Metadata } from 'next';
import './globals.css';
import '@fontsource/anton';
import '@fontsource/archivo-black';
import '@fontsource/bebas-neue';
import '@fontsource/oswald';
import '@fontsource/oswald/700.css';
import '@fontsource/montserrat';
import '@fontsource/montserrat/700.css';
import '@fontsource/montserrat/900.css';
import '@fontsource/poppins';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/800.css';
import '@fontsource/inter';
import '@fontsource/inter/600.css';
import '@fontsource/inter/800.css';
import '@fontsource/space-grotesk';
import '@fontsource/space-grotesk/700.css';
import '@fontsource/playfair-display';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/900.css';
import '@fontsource/raleway';
import '@fontsource/raleway/700.css';
import '@fontsource/raleway/900.css';
import '@fontsource/cairo';
import '@fontsource/cairo/700.css';
import '@fontsource/cairo/900.css';
import '@fontsource/tajawal';
import '@fontsource/tajawal/700.css';
import '@fontsource/tajawal/800.css';
import { headers } from 'next/headers';
import { getSite } from '@/lib/site';
import { getI18n } from '@/lib/i18n-server';
import { localePath, resolveLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/** Langue de la requête : segment d'URL transmis par proxy.ts, validé contre la config. */
async function requestLocale() {
  const [h, i18n] = await Promise.all([headers(), getI18n()]);
  return resolveLocale(i18n, h.get('x-wl-lang'));
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [i18n, h] = await Promise.all([getI18n(), headers()]);
    const locale = resolveLocale(i18n, h.get('x-wl-lang'));
    const site = await getSite(locale.code, i18n);
    const alternates = Object.fromEntries(
      i18n.locales.filter((l) => l.enabled).map((l) => [l.code, localePath(i18n, l.code)]),
    );
    return {
      title: site.theme.brand.siteTitle,
      description: site.theme.brand.description,
      alternates: { languages: alternates },
    };
  } catch {
    return { title: 'Site' };
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await requestLocale().catch(() => ({ code: 'fr', dir: 'ltr' as const }));
  return (
    <html lang={locale.code} dir={locale.dir}>
      <body>{children}</body>
    </html>
  );
}
