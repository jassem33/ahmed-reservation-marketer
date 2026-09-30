import { getSite } from '@/lib/site';
import type { I18nConfig, LocaleDef } from '@/lib/i18n';
import { currentAdmin } from '@/lib/auth';
import SiteApp from '@/components/SiteApp';
import TrackingScripts from '@/components/TrackingScripts';

/** Page publique d'une langue donnée (partagée entre `/` et `/[lang]`). */
export default async function SitePage({ locale, i18n }: { locale: LocaleDef; i18n: I18nConfig }) {
  const [site, admin] = await Promise.all([getSite(locale.code, i18n), currentAdmin()]);
  return (
    <>
      <SiteApp initial={site} initialAdmin={!!admin} locale={locale} i18n={i18n} />
      {/* Meta Pixel + GA4 : uniquement pour les visiteurs, pas pour l'admin connecté */}
      {!admin && <TrackingScripts />}
    </>
  );
}
