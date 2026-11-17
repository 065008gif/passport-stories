import { cookies } from 'next/headers';
import { ADMIN_COOKIE, NotConfigured, isAdmin, listEvents } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

const cell = (v: unknown) => {
  const s = typeof v === 'string' ? v : JSON.stringify(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Raw events as a CSV file, for analysis in Excel, Power BI or Python.
 * /api/admin/export?days=30 (admin only). One row per event.
 */
export async function GET(req: Request) {
  const jar = await cookies();
  if (!isAdmin(jar.get(ADMIN_COOKIE)?.value)) return new Response('Sign in first.', { status: 401 });
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 30));
  try {
    const rows = await listEvents(new Date(Date.now() - days * 864e5).toISOString(), 50000);
    const head = ['ts', 'visitor', 'session', 'event', 'path', 'device', 'source', 'referrer', 'first_seen', 'params'];
    const body = rows.map((r) => [r.ts, r.visitor, r.session, r.event, r.path, r.device, r.source, r.referrer, r.first_seen, r.params].map(cell).join(','));
    return new Response([head.join(','), ...body].join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="passport-stories-events-${days}d.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return new Response(e instanceof NotConfigured ? e.message : 'Storage error.', { status: e instanceof NotConfigured ? 503 : 500 });
  }
}
