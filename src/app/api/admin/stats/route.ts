import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE, NotConfigured, isAdmin, listEvents } from '@/lib/server/store';

export const dynamic = 'force-dynamic';

const top = (m: Map<string, number>, n: number) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, count]) => ({ name, count }));
const bump = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) || 0) + by);

/** Everything the analytics dashboard shows, worked out from the raw events. */
export async function GET(req: Request) {
  const jar = await cookies();
  if (!isAdmin(jar.get(ADMIN_COOKIE)?.value)) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 7));
  const since = new Date(Date.now() - days * 864e5);
  let events;
  try {
    events = await listEvents(since.toISOString());
  } catch (e) {
    return NextResponse.json({ error: e instanceof NotConfigured ? e.message : 'Storage error.' }, { status: e instanceof NotConfigured ? 503 : 500 });
  }

  const visitors = new Set<string>();
  const sessions = new Map<string, { visitor: string; seconds: number; views: number; start: string }>();
  const returning = new Set<string>();
  const visitorDays = new Map<string, Set<string>>();
  const pages = new Map<string, { views: number; seconds: number; timed: number; scroll: number; scrolled: number }>();
  const eventCounts = new Map<string, number>();
  const clicks = new Map<string, number>();
  const sources = new Map<string, number>();
  const devices = new Map<string, number>();
  const countries = new Map<string, number>();
  const sections = new Map<string, number>();
  const daily = new Map<string, { visitors: Set<string>; newVisitors: Set<string>; views: number }>();
  const funnel = { home: new Set<string>(), country: new Set<string>(), tool: new Set<string>(), share: new Set<string>() };
  const seenSessionSource = new Set<string>();
  let pageviews = 0;
  const feat = {
    prints: new Map<string, number>(),
    gates: new Map<string, number>(),
    spins: new Map<string, number>(),
    compares: new Map<string, number>(),
    games: new Map<string, number>(),
    shares: new Map<string, number>(),
  };

  for (const e of events) {
    const day = e.ts.slice(0, 10);
    visitors.add(e.visitor);
    if (!visitorDays.has(e.visitor)) visitorDays.set(e.visitor, new Set());
    visitorDays.get(e.visitor)!.add(day);
    if (e.first_seen && e.first_seen < day) returning.add(e.visitor);
    if (!sessions.has(e.session)) sessions.set(e.session, { visitor: e.visitor, seconds: 0, views: 0, start: e.ts });
    const s = sessions.get(e.session)!;
    if (!daily.has(day)) daily.set(day, { visitors: new Set(), newVisitors: new Set(), views: 0 });
    const d = daily.get(day)!;
    d.visitors.add(e.visitor);
    if (e.first_seen === day) d.newVisitors.add(e.visitor);
    bump(eventCounts, e.event);
    if (!seenSessionSource.has(e.session)) {
      seenSessionSource.add(e.session);
      bump(sources, e.source || 'direct');
      bump(devices, e.device || 'unknown');
    }
    const page = () => {
      if (!pages.has(e.path)) pages.set(e.path, { views: 0, seconds: 0, timed: 0, scroll: 0, scrolled: 0 });
      return pages.get(e.path)!;
    };
    const p = e.params || {};
    if (e.event === 'page_view') {
      pageviews++;
      s.views++;
      d.views++;
      page().views++;
      if (e.path === '/') funnel.home.add(e.visitor);
      if (e.path.startsWith('/countries/')) funnel.country.add(e.visitor);
    } else if (e.event === 'page_time') {
      const sec = Math.min(1800, Number(p.seconds) || 0);
      s.seconds += sec;
      const pg = page();
      pg.seconds += sec;
      pg.timed++;
      if (typeof p.max_scroll_percent === 'number') {
        pg.scroll += p.max_scroll_percent;
        pg.scrolled++;
      }
    } else if (e.event === 'ui_click') bump(clicks, String(p.label || '(unnamed)'));
    else if (e.event === 'country_view') bump(countries, String(p.country || ''));
    else if (e.event === 'section_view') bump(sections, `${e.path} · ${p.section}`);
    if (e.event === 'pass_print_started') bump(feat.prints, String(p.country || '?'));
    else if (e.event === 'home_gate_click') bump(feat.gates, String(p.target || p.gate || '?'));
    else if (e.event === 'globe_spun') bump(feat.spins, String(p.where || '?'));
    else if (e.event === 'compare_run') bump(feat.compares, String(p.comparison_pair || p.pair || e.path.replace('/compare/', '').replace('-vs-', ' vs ') || '?'));
    else if (e.event === 'quiz_completed' || e.event === 'quiz_started') bump(feat.games, `${p.mode || 'quiz'} · ${e.event === 'quiz_started' ? 'started' : 'finished'}`);
    else if (e.event === 'share_card_downloaded') bump(feat.shares, String(p.card_type || '?'));
    if (['compare_run', 'your_life_generated', 'quiz_completed', 'guess_made'].includes(e.event)) funnel.tool.add(e.visitor);
    if (['share_card_downloaded', 'outbound_social_click', 'fact_submitted'].includes(e.event)) funnel.share.add(e.visitor);
  }

  const sessionList = [...sessions.values()];
  const timed = sessionList.filter((s) => s.seconds > 0);
  const bounces = sessionList.filter((s) => s.views <= 1).length;
  const cameBack = [...visitorDays.values()].filter((set) => set.size > 1).length;

  // Fill every day in the range so the chart has no gaps.
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const d = daily.get(day);
    series.push({ day, visitors: d?.visitors.size || 0, newVisitors: d?.newVisitors.size || 0, views: d?.views || 0 });
  }

  return NextResponse.json({
    days,
    totalEvents: events.length,
    kpis: {
      visitors: visitors.size,
      sessions: sessions.size,
      pageviews,
      avgSessionSeconds: timed.length ? Math.round(timed.reduce((a, s) => a + s.seconds, 0) / timed.length) : 0,
      pagesPerSession: sessions.size ? +(pageviews / sessions.size).toFixed(1) : 0,
      bounceRate: sessions.size ? Math.round((bounces / sessions.size) * 100) : 0,
      returningVisitors: returning.size,
      returningRate: visitors.size ? Math.round((returning.size / visitors.size) * 100) : 0,
      cameBackAnotherDay: cameBack,
    },
    series,
    pages: [...pages.entries()]
      .map(([path, v]) => ({ path, views: v.views, avgSeconds: v.timed ? Math.round(v.seconds / v.timed) : 0, avgScroll: v.scrolled ? Math.round(v.scroll / v.scrolled) : 0 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 25),
    events: top(eventCounts, 30),
    clicks: top(clicks, 25),
    sources: top(sources, 12),
    devices: top(devices, 5),
    countries: top(countries, 20),
    sections: top(sections, 20),
    features: {
      prints: top(feat.prints, 20),
      gates: top(feat.gates, 4),
      spins: top(feat.spins, 4),
      compares: top(feat.compares, 15),
      games: top(feat.games, 12),
      shares: top(feat.shares, 6),
    },
    funnel: [
      { step: 'Opened the home page', visitors: funnel.home.size },
      { step: 'Opened a country', visitors: funnel.country.size },
      { step: 'Used a tool (compare, Your Life, quiz, guess)', visitors: funnel.tool.size },
      { step: 'Shared, clicked a social link or sent a fact', visitors: funnel.share.size },
    ],
  });
}
