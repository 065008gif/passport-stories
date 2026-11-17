import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, NotConfigured, isAdmin, pruneEvents } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

/** Delete analytics events older than N days (default 180) to keep the free database small. */
export async function POST(req: Request) {
  if (!isAdmin((await cookies()).get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const days = Math.max(30, Number(new URL(req.url).searchParams.get('days')) || 180);
  try {
    await pruneEvents(days);
    return NextResponse.json({ ok: true, days });
  } catch (e) {
    return NextResponse.json({ error: e instanceof NotConfigured ? e.message : 'Storage error.' }, { status: e instanceof NotConfigured ? 503 : 500 });
  }
}
