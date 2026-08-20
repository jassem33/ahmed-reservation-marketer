import { getSite } from '@/lib/site';
import { currentAdmin } from '@/lib/auth';
import SiteApp from '@/components/SiteApp';
import TrackingScripts from '@/components/TrackingScripts';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [site, admin] = await Promise.all([getSite(), currentAdmin()]);
  return (
    <>
      <SiteApp initial={site} initialAdmin={!!admin} />
      {/* Meta Pixel + GA4 : uniquement pour les visiteurs, pas pour l'admin connecté */}
      {!admin && <TrackingScripts />}
    </>
  );
}
