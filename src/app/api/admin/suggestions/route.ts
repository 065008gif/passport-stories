import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, NotConfigured, deleteSuggestion, isAdmin, listSuggestions, setSuggestionStatus } from '@/lib/server/store';

export const dynamic = 'force-dynamic';
const guard = async () => isAdmin((await cookies()).get(ADMIN_COOKIE)?.value);
const fail = (e: unknown) => NextResponse.json({ error: e instanceof NotConfigured ? e.message : 'Storage error.' }, { status: e instanceof NotConfigured ? 503 : 500 });

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  try {
    return NextResponse.json({ suggestions: await listSuggestions() });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(req: Request) {
  if (!(await guard())) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id, status } = (await req.json().catch(() => ({}))) as { id?: string; status?: string };
  if (!id || (status !== 'new' && status !== 'done')) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  try {
    await setSuggestionStatus(id, status);
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
    await deleteSuggestion(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
