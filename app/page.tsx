import { getSite } from '@/lib/site';
import { currentAdmin } from '@/lib/auth';
import SiteApp from '@/components/SiteApp';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [site, admin] = await Promise.all([getSite(), currentAdmin()]);
  return <SiteApp initial={site} initialAdmin={!!admin} />;
}
