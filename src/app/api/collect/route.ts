import { NextResponse } from 'next/server';
import { type EventRow, NotConfigured, addEvents } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

const str = (v: unknown, max: number) => String(v ?? '').slice(0, max);

/** Receives batches of analytics events from the browser (see lib/analytics.ts). */
export async function POST(req: Request) {
  let body: { visitor?: string; session?: string; first_seen?: string; device?: string; referrer?: string; source?: string; events?: { event?: string; path?: string; ts?: number; params?: Record<string, unknown> }[] };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const events = Array.isArray(body.events) ? body.events.slice(0, 60) : [];
  if (!body.visitor || !body.session || !events.length) return new NextResponse(null, { status: 204 });
  const now = Date.now();
  const rows: EventRow[] = events.map((e) => {
    const params: Record<string, unknown> = {};
    Object.entries(e.params || {}).slice(0, 20).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params[k.slice(0, 40)] = typeof v === 'number' || typeof v === 'boolean' ? v : str(v, 160);
    });
    const ts = typeof e.ts === 'number' && Math.abs(now - e.ts) < 36e5 ? e.ts : now;
    return {
      ts: new Date(ts).toISOString(),
      visitor: str(body.visitor, 40),
      session: str(body.session, 40),
      event: str(e.event, 40),
      path: str(e.path, 120),
      params,
      referrer: str(body.referrer, 120),
      device: str(body.device, 12),
      source: str(body.source, 60),
      first_seen: str(body.first_seen, 10),
    };
  });
  try {
    await addEvents(rows);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    // 503 tells the browser to stop sending for this visit.
    return new NextResponse(null, { status: e instanceof NotConfigured ? 503 : 500 });
  }
}
