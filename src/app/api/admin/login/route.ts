import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, adminPassword, adminToken, isAdmin, passwordMatches, storeMode } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

/** Is this browser signed in, and is storage set up? */
export async function GET() {
  const jar = await cookies();
  return NextResponse.json({ signedIn: isAdmin(jar.get(ADMIN_COOKIE)?.value), storage: storeMode(), passwordSet: Boolean(adminPassword()), usingDefaultPassword: !process.env.ADMIN_PASSWORD });
}

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!adminPassword()) return NextResponse.json({ error: 'Set ADMIN_PASSWORD in the environment variables first.' }, { status: 503 });
  if (!passwordMatches(String(password || ''))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: 'Wrong password.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
