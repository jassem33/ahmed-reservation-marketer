import { redirect } from 'next/navigation';
import { currentAdmin } from '@/lib/auth';
import { getSite } from '@/lib/site';
import AdminShell from '@/components/AdminShell';
import HealthBanner from '@/components/HealthBanner';

export const dynamic = 'force-dynamic';

// Toutes les pages /admin/* passent par ici : accès réservé à l'administrateur connecté.
export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const [admin, site] = await Promise.all([currentAdmin(), getSite()]);
  if (!admin) redirect('/admin/login');
  return (
    <AdminShell initial={site}>
      <HealthBanner />
      {children}
    </AdminShell>
  );
}
