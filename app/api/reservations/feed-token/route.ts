import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/auth';
import { getFeedToken, rotateFeedToken } from '@/lib/feed';

/** Jeton du flux des réservations (admin) : lecture, ou régénération (POST). */
export async function GET() {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return NextResponse.json({ token: await getFeedToken() });
}

export async function POST() {
  if (!(await currentAdmin())) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  return NextResponse.json({ token: await rotateFeedToken() });
}
