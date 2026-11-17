import { NextResponse } from 'next/server';
import { NotConfigured, addSuggestion, hashIp, recentSuggestionsFrom } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

/** "Ask the Map": a visitor suggests a country or topic. Read in /admin > Suggestions. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (body.website) return NextResponse.json({ ok: true }); // honeypot
  const kind = body.kind === 'topic' ? 'topic' : 'country';
  const suggestion = String(body.suggestion || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const reason = String(body.reason || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  const email = String(body.email || '').trim().slice(0, 120);
  if (suggestion.length < 2) return NextResponse.json({ error: 'Tell us what to cover.' }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'That email does not look right.' }, { status: 400 });
  if (/https?:\/\/|www\./i.test(suggestion + ' ' + reason)) return NextResponse.json({ error: 'Links are not allowed.' }, { status: 400 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const ip_hash = hashIp(ip);
  try {
    if ((await recentSuggestionsFrom(ip_hash)) >= 5) return NextResponse.json({ error: 'Thanks! That is plenty for now. Try again in an hour.' }, { status: 429 });
    await addSuggestion({ kind, suggestion, reason, email, ip_hash });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NotConfigured) return NextResponse.json({ error: 'Suggestions are not switched on yet.' }, { status: 503 });
    return NextResponse.json({ error: 'Could not send. Please try again.' }, { status: 500 });
  }
}
