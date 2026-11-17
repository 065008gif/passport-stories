import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, isAdmin, storageCheck, storeMode } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

/** Setup checklist for /admin: what is switched on, what is still missing. */
export async function GET() {
  if (!isAdmin((await cookies()).get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const tables = await storageCheck();
  return NextResponse.json({
    storage: storeMode(),
    tables,
    adminPassword: Boolean(process.env.ADMIN_PASSWORD),
    ga4: Boolean(process.env.NEXT_PUBLIC_GA_ID),
    clarity: Boolean(process.env.NEXT_PUBLIC_CLARITY_ID),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || '',
  });
}
