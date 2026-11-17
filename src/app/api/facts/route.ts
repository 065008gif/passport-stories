import { NextResponse } from 'next/server';
import { COUNTRIES } from '@/data/countries';
import { NotConfigured, addFact, hashIp, isDuplicateFact, listFacts, recentFactsFrom } from '@/lib/server/store';

export const dynamic = 'force-dynamic';
const SLUGS = new Set(COUNTRIES.map((c) => c.slug));

/** Approved facts, newest first. Optional ?country=japan. */
export async function GET(req: Request) {
  const country = new URL(req.url).searchParams.get('country') || undefined;
  try {
    const facts = await listFacts({ status: 'approved', country, limit: country ? 30 : 120 });
    return NextResponse.json({ facts: facts.map(({ id, country: c, fact, name, created_at }) => ({ id, country: c, fact, name, created_at })) });
  } catch (e) {
    return NextResponse.json({ facts: [], configured: !(e instanceof NotConfigured) }, { status: e instanceof NotConfigured ? 200 : 500 });
  }
}

/** A visitor submits a fact. It is stored as "pending" until approved in /admin. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
  // Honeypot: real people never fill the hidden "website" field.
  if (body.website) return NextResponse.json({ ok: true });
  const country = String(body.country || '');
  const fact = String(body.fact || '').replace(/\s+/g, ' ').trim();
  const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 40) || 'A traveller';
  if (!SLUGS.has(country)) return NextResponse.json({ error: 'Pick a country.' }, { status: 400 });
  if (fact.length < 20) return NextResponse.json({ error: 'Tell us a little more: at least 20 characters.' }, { status: 400 });
  if (fact.length > 280) return NextResponse.json({ error: 'Keep it under 280 characters.' }, { status: 400 });
  if (/https?:\/\/|www\./i.test(fact)) return NextResponse.json({ error: 'Links are not allowed in facts.' }, { status: 400 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  const ip_hash = hashIp(ip);
  try {
    if ((await recentFactsFrom(ip_hash)) >= 5) return NextResponse.json({ error: 'Thanks! That is plenty for now. Try again in an hour.' }, { status: 429 });
    if (await isDuplicateFact(fact)) return NextResponse.json({ ok: true }); // already in the queue
    await addFact({ country, fact, name, ip_hash });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof NotConfigured) return NextResponse.json({ error: 'Fact submissions are not switched on yet.' }, { status: 503 });
    return NextResponse.json({ error: 'Could not save your fact. Please try again.' }, { status: 500 });
  }
}
