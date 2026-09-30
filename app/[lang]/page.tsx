import { notFound, redirect } from 'next/navigation';
import { getI18n } from '@/lib/i18n-server';
import { findLocale } from '@/lib/i18n';
import SitePage from '@/components/SitePage';

export const dynamic = 'force-dynamic';

/** Version du site dans une autre langue que la langue par défaut : `/ar`, `/en`… */
export default async function LocalizedHome({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const i18n = await getI18n();
  const locale = findLocale(i18n, lang);
  if (!locale || !locale.enabled) notFound();
  // la langue par défaut n'a qu'une seule adresse : la racine
  if (locale.code === i18n.defaultLocale) redirect('/');
  return <SitePage locale={locale} i18n={i18n} />;
}
