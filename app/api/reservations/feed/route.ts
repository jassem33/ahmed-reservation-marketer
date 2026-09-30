import { NextRequest, NextResponse } from 'next/server';
import { feedRows, getFeedToken, toCsv, toXml, tokenMatches } from '@/lib/feed';
import { getSite } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * Flux public (protégé par jeton) des clients ayant réservé, toujours à jour :
 *   GET /api/reservations/feed?key=<jeton>             → XML (RSS 2.0)
 *   GET /api/reservations/feed?key=<jeton>&format=csv  → CSV (liste de clients Meta)
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  const expected = await getFeedToken();
  if (!tokenMatches(key, expected)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }
  const rows = await feedRows();
  const format = req.nextUrl.searchParams.get('format');
  const headers = { 'Cache-Control': 'no-store' };
  if (format === 'csv') {
    return new NextResponse(toCsv(rows), {
      headers: {
        ...headers,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="reservations.csv"',
      },
    });
  }
  const site = await getSite();
  return new NextResponse(toXml(rows, site.theme.brand.siteTitle, req.nextUrl.origin), {
    headers: { ...headers, 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
}
