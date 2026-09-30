import { getI18n } from '@/lib/i18n-server';
import { resolveLocale } from '@/lib/i18n';
import SitePage from '@/components/SitePage';

export const dynamic = 'force-dynamic';

/** Racine du site : langue par défaut. Les autres langues vivent sous `/[lang]`. */
export default async function Home() {
  const i18n = await getI18n();
  return <SitePage locale={resolveLocale(i18n, null)} i18n={i18n} />;
}
