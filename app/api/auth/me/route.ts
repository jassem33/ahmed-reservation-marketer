import { NextResponse } from 'next/server';
import { currentAdmin } from '@/lib/auth';

export async function GET() {
  const user = await currentAdmin();
  return NextResponse.json({ admin: !!user, username: user });
}
