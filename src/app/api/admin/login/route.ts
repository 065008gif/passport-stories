import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, LOCK_MINUTES, MAX_TRIES_PER_SENDER, MAX_TRIES_TOTAL, adminPassword, adminToken, clearFailedLogins, failedLogins, hashIp, isAdmin, passwordMatches, recordFailedLogin, storeMode } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

/** Is this browser signed in, and is storage set up? */
export async function GET() {
  const jar = await cookies();
  return NextResponse.json({ signedIn: isAdmin(jar.get(ADMIN_COOKIE)?.value), storage: storeMode(), passwordSet: Boolean(adminPassword()), usingDefaultPassword: !process.env.ADMIN_PASSWORD });
}

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!adminPassword()) return NextResponse.json({ error: 'Set ADMIN_PASSWORD in the environment variables first.' }, { status: 503 });

  // Lockout: 5 wrong passwords from one sender, or 30 from everyone, locks sign-in for 15 minutes.
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const ipHash = hashIp(ip);
  const tries = await failedLogins(ipHash);
  if (tries.mine >= MAX_TRIES_PER_SENDER || tries.all >= MAX_TRIES_TOTAL) {
    return NextResponse.json({ error: `Too many wrong passwords. Sign-in is locked for ${LOCK_MINUTES} minutes.` }, { status: 429 });
  }

  if (!passwordMatches(String(password || ''))) {
    await recordFailedLogin(ipHash);
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    const left = MAX_TRIES_PER_SENDER - tries.mine - 1;
    return NextResponse.json({ error: left > 0 ? `Wrong password. ${left} ${left === 1 ? 'try' : 'tries'} left before a ${LOCK_MINUTES}-minute lock.` : `Wrong password. Sign-in is now locked for ${LOCK_MINUTES} minutes.` }, { status: 401 });
  }
  await clearFailedLogins(ipHash);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
