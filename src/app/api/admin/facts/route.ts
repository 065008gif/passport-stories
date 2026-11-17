import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, type Fact, NotConfigured, deleteFact, isAdmin, listFacts, setFactStatus } from '@/lib/server/store';

export const dynamic = 'force-dynamic';
const STATUSES = ['pending', 'approved', 'rejected'] as const;

async function guard() {
  const jar = await cookies();
  return isAdmin(jar.get(ADMIN_COOKIE)?.value);
}
const fail = (e: unknown) => NextResponse.json({ error: e instanceof NotConfigured ? e.message : 'Storage error.' }, { status: e instanceof NotConfigured ? 503 : 500 });

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  try {
    const [pending, approved, rejected] = await Promise.all(STATUSES.map((status) => listFacts({ status, limit: 200 })));
    return NextResponse.json({ pending, approved, rejected });
  } catch (e) {
    return fail(e);
  }
}

/** Approve, reject or put back in the queue. */
export async function PATCH(req: Request) {
  if (!(await guard())) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id, status } = (await req.json().catch(() => ({}))) as { id?: string; status?: Fact['status'] };
  if (!id || !status || !STATUSES.includes(status)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  try {
    await setFactStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request) {
  if (!(await guard())) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  try {
    await deleteFact(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
