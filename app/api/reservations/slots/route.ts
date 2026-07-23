import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getSite } from '@/lib/site';
import { bookingConfigFrom, isValidDateStr, slotsForDate } from '@/lib/booking';

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date') ?? '';
  if (!isValidDateStr(date)) {
    return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
  }
  const site = await getSite();
  const booking = site.page.sections.find((s) => s.type === 'booking');
  if (!booking) return NextResponse.json({ slots: [] });
  const cfg = bookingConfigFrom(booking.data);
  const { rows } = await pool.query(
    "SELECT slot FROM reservations WHERE date = $1 AND status <> 'cancelled'",
    [date],
  );
  const booked = rows.map((r) => String(r.slot));
  return NextResponse.json({ slots: slotsForDate(cfg, date, booked) });
}
