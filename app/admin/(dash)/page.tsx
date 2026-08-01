import { redirect } from 'next/navigation';

// /admin → page d'accueil du tableau de bord (redirige vers les réservations).
export default function AdminHome() {
  redirect('/admin/reservations');
}
