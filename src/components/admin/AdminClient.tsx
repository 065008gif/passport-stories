'use client';

/**
 * The back office at /admin (not linked from the site, password protected).
 *
 *  Facts      approve or reject facts sent in by visitors
 *  Analytics  the site's own numbers: visitors, time per page, retention,
 *             clicks, scroll depth, sources, a simple funnel
 */
import { useCallback, useEffect, useState } from 'react';
import { flagSrc } from '@/components/Flag';

interface Fact {
  id: string;
  country: string;
  fact: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
interface Named {
  name: string;
  count: number;
}
interface Stats {
  days: number;
  totalEvents: number;
  kpis: { visitors: number; sessions: number; pageviews: number; avgSessionSeconds: number; pagesPerSession: number; bounceRate: number; returningVisitors: number; returningRate: number; cameBackAnotherDay: number };
  series: { day: string; visitors: number; newVisitors: number; views: number }[];
  pages: { path: string; views: number; avgSeconds: number; avgScroll: number }[];
  events: Named[];
  clicks: Named[];
  sources: Named[];
  devices: Named[];
  countries: Named[];
  sections: Named[];
  funnel: { step: string; visitors: number }[];
  features?: { prints: Named[]; gates: Named[]; spins: Named[]; compares: Named[]; games: Named[]; shares: Named[] };
}

const clock = (s: number) => (s >= 60 ? `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` : `${s}s`);
const CARD = 'rounded-3xl border border-cream/15 bg-white/[0.05] p-5';

function BarList({ title, rows, note, color = '#FFB72B' }: { title: string; rows: Named[]; note?: string; color?: string }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className={CARD}>
      <h3 className="h-display text-xl">{title}</h3>
      {note && <p className="mt-0.5 text-sm text-cream/65">{note}</p>}
      {rows.length === 0 ? (
        <p className="mt-4 font-mono text-sm text-cream/50">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.name} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
              <div className="relative overflow-hidden rounded-lg bg-cream/[0.07] px-2.5 py-1.5">
                <span className="absolute inset-y-0 left-0 rounded-lg opacity-30" style={{ width: `${(r.count / max) * 100}%`, background: color }} />
                <span className="relative block truncate font-semibold">{r.name || '(none)'}</span>
              </div>
              <span className="font-mono font-bold tabular-nums">{r.count.toLocaleString('en-IN')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminClient({ names }: { names: Record<string, string> }) {
  const [status, setStatus] = useState<{ signedIn: boolean; storage: string; passwordSet: boolean; usingDefaultPassword: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'facts' | 'suggestions' | 'analytics' | 'setup'>('facts');
  const [sugs, setSugs] = useState<{ id: string; kind: string; suggestion: string; reason: string; email: string; status: 'new' | 'done'; created_at: string }[] | null>(null);
  const [setup, setSetup] = useState<{ storage: string; tables: Record<string, boolean>; adminPassword: boolean; ga4: boolean; instagram: { connected: boolean; posts: number; note: string }; siteUrl: string } | null>(null);
  const [facts, setFacts] = useState<{ pending: Fact[]; approved: Fact[]; rejected: Fact[] } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [days, setDays] = useState(7);
  const [note, setNote] = useState('');

  const loadSugs = useCallback(async () => {
    const r = await fetch('/api/admin/suggestions');
    const d = await r.json().catch(() => ({}));
    if (r.ok) setSugs(d.suggestions);
    else setNote(d.error || 'Could not load suggestions.');
  }, []);
  const loadSetup = useCallback(async () => {
    const r = await fetch('/api/admin/setup');
    if (r.ok) setSetup(await r.json());
  }, []);
  const sugAction = async (id: string, status?: 'new' | 'done') => {
    await fetch(status ? '/api/admin/suggestions' : `/api/admin/suggestions?id=${encodeURIComponent(id)}`, status ? { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) } : { method: 'DELETE' });
    loadSugs();
  };
  const prune = async () => {
    if (!window.confirm('Delete analytics events older than 180 days? This cannot be undone.')) return;
    const r = await fetch('/api/admin/prune?days=180', { method: 'POST' });
    setNote(r.ok ? 'Old events deleted.' : 'Could not delete old events.');
  };

  const check = useCallback(() => fetch('/api/admin/login').then((r) => r.json()).then(setStatus), []);
  useEffect(() => {
    check();
  }, [check]);

  const loadFacts = useCallback(async () => {
    const r = await fetch('/api/admin/facts');
    const d = await r.json();
    if (r.ok) setFacts(d);
    else setNote(d.error || 'Could not load facts.');
  }, []);
  const loadStats = useCallback(async (n: number) => {
    setStats(null);
    const r = await fetch(`/api/admin/stats?days=${n}`);
    const d = await r.json();
    if (r.ok) setStats(d);
    else setNote(d.error || 'Could not load analytics.');
  }, []);

  useEffect(() => {
    if (!status?.signedIn) return;
    loadFacts();
    loadStats(days);
    loadSugs();
    loadSetup();
  }, [status?.signedIn, days, loadFacts, loadStats, loadSugs, loadSetup]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (r.ok) {
      setPassword('');
      check();
    } else setError((await r.json()).error || 'Could not sign in.');
  };
  const signOut = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' });
    setFacts(null);
    setStats(null);
    check();
  };
  const decide = async (id: string, next: Fact['status'] | 'delete') => {
    if (next === 'delete') await fetch(`/api/admin/facts?id=${id}`, { method: 'DELETE' });
    else await fetch('/api/admin/facts', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: next }) });
    loadFacts();
  };

  if (!status) return <p className="font-mono text-sm text-cream/60">Loading…</p>;

  /* -------------------------------- sign in -------------------------------- */
  if (!status.signedIn) {
    return (
      <form onSubmit={signIn} className="mx-auto mt-10 max-w-sm rounded-3xl border border-cream/20 bg-night/70 p-6">
        <p className="kicker text-sun">Staff only</p>
        <h1 className="h-display mt-1 text-3xl">Back office</h1>
        <p className="mt-2 text-sm text-cream/75">Review visitor facts and read the site&rsquo;s analytics.</p>
        <label className="mt-5 block">
          <span className="kicker mb-1 block text-cream/80">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus className="h-12 w-full rounded-full border-2 border-cream/25 bg-night px-4 font-semibold text-cream focus:border-sun" />
        </label>
        <button className="btn btn-sun mt-4 w-full">Sign in</button>
        <p role="alert" className="mt-2 min-h-5 text-sm font-semibold text-coral">
          {error}
        </p>
        {!status.passwordSet && <p className="text-sm text-cream/70">No password is set. Add ADMIN_PASSWORD to the environment variables and redeploy.</p>}
        {status.passwordSet && status.usingDefaultPassword && <p className="text-sm text-cream/70">Running on your computer with the default password: <b>passport</b>. Set ADMIN_PASSWORD before going live.</p>}
      </form>
    );
  }

  /* -------------------------------- signed in -------------------------------- */
  const k = stats?.kpis;
  const maxDay = Math.max(...(stats?.series.map((d) => d.visitors) || [1]), 1);
  const funnelTop = Math.max(...(stats?.funnel.map((f) => f.visitors) || [1]), 1);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker text-sun">Back office · storage: {status.storage === 'supabase' ? 'Supabase' : status.storage === 'file' ? 'local file (this computer only)' : 'not set up'}</p>
          <h1 className="h-display mt-1 text-4xl">Passport Stories control room</h1>
        </div>
        <button onClick={signOut} className="btn btn-ghost">
          Sign out
        </button>
      </div>
      {status.storage === 'none' && <p className="mt-4 rounded-2xl bg-coral p-4 font-semibold text-white">Storage is not set up, so nothing can be saved. Add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel and redeploy (steps in BACKEND.md).</p>}
      {note && <p className="mt-4 rounded-2xl bg-coral/20 p-3 text-sm font-semibold">{note}</p>}

      <div className="mt-6 flex gap-2" role="tablist">
        {(
          [
            ['facts', `Facts${facts ? ` · ${facts.pending.length} waiting` : ''}`],
            ['suggestions', `Suggestions${sugs ? ` · ${sugs.filter((x) => x.status === 'new').length} new` : ''}`],
            ['analytics', 'Analytics'],
            ['setup', 'Setup check'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-full px-5 py-2.5 text-sm font-extrabold transition-colors ${tab === id ? 'bg-sun text-ink' : 'border-2 border-cream/25 text-cream hover:border-sun'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ---------------------------------- Facts ---------------------------------- */}
      {tab === 'facts' && (
        <div className="mt-6 space-y-8">
          {(
            [
              ['pending', 'Waiting for review', 'These are not visible on the site.'],
              ['approved', 'Published', 'Visible on the Community page and the country page.'],
              ['rejected', 'Rejected', 'Hidden. Delete to remove for good.'],
            ] as const
          ).map(([key, title, sub]) => (
            <section key={key}>
              <h2 className="h-display text-2xl">
                {title} <span className="font-mono text-base text-cream/60">{facts ? facts[key].length : '…'}</span>
              </h2>
              <p className="text-sm text-cream/65">{sub}</p>
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {facts?.[key].map((f) => (
                  <li key={f.id} className={CARD}>
                    <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-cream/75">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={flagSrc(f.country)} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                      {names[f.country] || f.country} · {f.name} · {new Date(f.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                    <p className="mt-2 text-lg font-semibold leading-snug">{f.fact}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {key !== 'approved' && (
                        <button onClick={() => decide(f.id, 'approved')} className="rounded-full bg-teal px-4 py-2 text-sm font-extrabold text-white hover:brightness-110">
                          ✓ Approve
                        </button>
                      )}
                      {key !== 'rejected' && (
                        <button onClick={() => decide(f.id, 'rejected')} className="rounded-full bg-coral px-4 py-2 text-sm font-extrabold text-white hover:brightness-110">
                          ✗ {key === 'approved' ? 'Unpublish' : 'Reject'}
                        </button>
                      )}
                      {key === 'rejected' && (
                        <button onClick={() => decide(f.id, 'delete')} className="rounded-full border-2 border-cream/30 px-4 py-2 text-sm font-bold hover:border-coral">
                          Delete
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {facts && facts[key].length === 0 && <p className="mt-3 font-mono text-sm text-cream/50">Nothing here.</p>}
            </section>
          ))}
        </div>
      )}

      {/* ------------------------------- Suggestions ------------------------------- */}
      {tab === 'suggestions' && (
        <div className="mt-6">
          <h2 className="h-display text-2xl">Ask the Map</h2>
          <p className="text-sm text-cream/65">Countries and topics visitors want next. Mark them done once covered.</p>
          {sugs && sugs.length === 0 && <p className="mt-4 font-mono text-sm text-cream/60">No suggestions yet.</p>}
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {sugs?.map((x) => (
              <li key={x.id} className={`${CARD} ${x.status === 'done' ? 'opacity-60' : ''}`}>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-cream/70">
                  {x.kind} · {new Date(x.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} {x.status === 'done' && '· done'}
                </p>
                <p className="mt-1 text-lg font-bold">{x.suggestion}</p>
                {x.reason && <p className="mt-1 text-sm text-cream/80">{x.reason}</p>}
                {x.email && (
                  <a href={`mailto:${x.email}`} className="mt-1 inline-block text-sm text-sky underline">
                    {x.email}
                  </a>
                )}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => sugAction(x.id, x.status === 'new' ? 'done' : 'new')} className="rounded-full bg-sun px-3 py-1.5 text-sm font-bold text-ink">
                    {x.status === 'new' ? 'Mark done' : 'Mark new'}
                  </button>
                  <button onClick={() => sugAction(x.id)} className="rounded-full border-2 border-cream/25 px-3 py-1.5 text-sm font-bold">
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* --------------------------------- Setup ---------------------------------- */}
      {tab === 'setup' && (
        <div className="mt-6 max-w-2xl">
          <h2 className="h-display text-2xl">Setup check</h2>
          <p className="text-sm text-cream/65">Everything should be green before you share the site.</p>
          <ul className="mt-4 space-y-2">
            {(
              [
                ['Database connected (Supabase)', setup?.storage === 'supabase', 'Add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel, then redeploy.'],
                ['Table: facts', setup?.tables.facts, 'Run supabase/schema.sql in the Supabase SQL Editor.'],
                ['Table: events (analytics)', setup?.tables.events, 'Run supabase/schema.sql in the Supabase SQL Editor.'],
                ['Table: suggestions', setup?.tables.suggestions, 'Run supabase/schema.sql again (it only adds what is missing).'],
                ['Table: admin_attempts (sign-in lockout)', setup?.tables.admin_attempts, 'Run supabase/schema.sql again (it only adds what is missing).'],
                ['Table: settings (Instagram token renewal)', setup?.tables.settings, 'Run supabase/schema.sql again (it only adds what is missing).'],
                ['Admin password set', setup?.adminPassword, 'Add ADMIN_PASSWORD in Vercel.'],
                ['Google Analytics 4', setup?.ga4, 'Add NEXT_PUBLIC_GA_ID (G-XXXXXXXXXX) in Vercel, then redeploy.'],
                [`Instagram feed${setup?.instagram.connected ? ` (${setup.instagram.posts} latest posts)` : ''}`, setup?.instagram.connected, setup?.instagram.note || 'Add INSTAGRAM_TOKEN in Vercel, then redeploy.'],
              ] as const
            ).map(([label, ok, fix]) => (
              <li key={label} className={`${CARD} flex items-start gap-3`}>
                <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${ok ? 'bg-teal text-ink' : 'bg-tang text-ink'}`}>{ok ? '✓' : '!'}</span>
                <span>
                  <span className="font-bold">{label}</span>
                  {!ok && <span className="block text-sm text-cream/75">{fix}</span>}
                </span>
              </li>
            ))}
          </ul>
          <div className={`${CARD} mt-6`}>
            <h3 className="h-display text-xl">Housekeeping</h3>
            <p className="mt-1 text-sm text-cream/75">The free database holds 500 MB. Analytics events are small, but you can clear anything older than 180 days.</p>
            <button onClick={prune} className="mt-3 rounded-full border-2 border-cream/25 px-4 py-2 text-sm font-bold hover:border-sun">
              Delete events older than 180 days
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------- Analytics -------------------------------- */}
      {tab === 'analytics' && (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="kicker text-cream/70">Period</span>
            {[1, 7, 30, 90].map((n) => (
              <button key={n} onClick={() => setDays(n)} aria-pressed={days === n} className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${days === n ? 'bg-sun text-ink' : 'border-2 border-cream/20 hover:border-sun'}`}>
                {n === 1 ? 'Today' : `${n} days`}
              </button>
            ))}
            <a href={`/api/admin/export?days=${Math.max(days, 30)}`} className="ml-auto rounded-full border-2 border-cream/20 px-3.5 py-1.5 text-sm font-bold hover:border-sun">
              ⬇ Export CSV
            </a>
            <button onClick={() => loadStats(days)} className="rounded-full border-2 border-cream/20 px-3.5 py-1.5 text-sm font-bold hover:border-sun">
              ↻ Refresh
            </button>
          </div>

          {!stats || !k ? (
            <p className="mt-6 font-mono text-sm text-cream/60">Crunching events…</p>
          ) : (
            <>
              <dl className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {(
                  [
                    ['Visitors', k.visitors.toLocaleString('en-IN'), 'different people'],
                    ['Sessions', k.sessions.toLocaleString('en-IN'), `${k.pagesPerSession} pages each`],
                    ['Page views', k.pageviews.toLocaleString('en-IN'), `${stats.totalEvents.toLocaleString('en-IN')} events in total`],
                    ['Avg time per visit', clock(k.avgSessionSeconds), 'tab actually on screen'],
                    ['Returning visitors', `${k.returningRate}%`, `${k.returningVisitors} had been here before`],
                    ['Came back another day', k.cameBackAnotherDay.toLocaleString('en-IN'), 'seen on 2+ days in this period'],
                    ['Bounce rate', `${k.bounceRate}%`, 'left after one page'],
                    ['Top source', stats.sources[0]?.name || 'n/a', 'where visits started'],
                  ] as const
                ).map(([label, value, sub]) => (
                  <div key={label} className={CARD}>
                    <dt className="font-mono text-[11px] uppercase tracking-wider text-cream/65">{label}</dt>
                    <dd className="h-display mt-1 truncate text-3xl text-sun">{value}</dd>
                    <dd className="mt-0.5 text-xs text-cream/60">{sub}</dd>
                  </div>
                ))}
              </dl>

              {/* Visitors per day */}
              <div className={`${CARD} mt-4`}>
                <h3 className="h-display text-xl">Visitors per day</h3>
                <p className="text-sm text-cream/65">
                  <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-sun align-middle" /> new <span className="ml-3 mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-sky align-middle" /> returning
                </p>
                <div className="mt-4 flex h-44 items-end gap-1">
                  {stats.series.map((d) => (
                    <div key={d.day} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.day}: ${d.visitors} visitors (${d.newVisitors} new), ${d.views} page views`}>
                      <div className="w-full rounded-t bg-sky" style={{ height: `${((d.visitors - d.newVisitors) / maxDay) * 100}%` }} />
                      <div className="w-full bg-sun" style={{ height: `${(d.newVisitors / maxDay) * 100}%`, borderRadius: d.visitors === d.newVisitors ? '4px 4px 0 0' : 0 }} />
                    </div>
                  ))}
                </div>
                <p className="mt-2 flex justify-between font-mono text-[10px] text-cream/55">
                  <span>{stats.series[0]?.day}</span>
                  <span>{stats.series[stats.series.length - 1]?.day}</span>
                </p>
              </div>

              {/* Pages */}
              <div className={`${CARD} mt-4 overflow-x-auto`}>
                <h3 className="h-display text-xl">Pages</h3>
                <p className="text-sm text-cream/65">Views, average time on the page and how far down people scrolled.</p>
                <table className="mt-3 w-full min-w-[520px] text-left text-sm">
                  <thead className="font-mono text-[11px] uppercase tracking-wider text-cream/60">
                    <tr>
                      <th className="py-2 font-medium">Page</th>
                      <th className="py-2 text-right font-medium">Views</th>
                      <th className="py-2 text-right font-medium">Avg time</th>
                      <th className="py-2 text-right font-medium">Avg scroll</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.pages.map((p) => (
                      <tr key={p.path} className="border-t border-cream/10">
                        <td className="max-w-[18rem] truncate py-2 font-semibold">{p.path}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{p.views}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{p.avgSeconds ? clock(p.avgSeconds) : '–'}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{p.avgScroll ? `${p.avgScroll}%` : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {stats.pages.length === 0 && <p className="mt-3 font-mono text-sm text-cream/50">No page views yet. Open the site in another tab and come back.</p>}
              </div>

              {/* Funnel */}
              <div className={`${CARD} mt-4`}>
                <h3 className="h-display text-xl">Funnel</h3>
                <p className="text-sm text-cream/65">How many visitors got as far as each step.</p>
                <ol className="mt-4 space-y-2">
                  {stats.funnel.map((f, i) => (
                    <li key={f.step}>
                      <div className="flex items-baseline justify-between gap-3 text-sm font-semibold">
                        <span>
                          {i + 1}. {f.step}
                        </span>
                        <span className="font-mono tabular-nums">
                          {f.visitors} · {Math.round((f.visitors / funnelTop) * 100)}%
                        </span>
                      </div>
                      <div className="mt-1 h-3 overflow-hidden rounded-full bg-cream/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-tang via-sun to-sun" style={{ width: `${(f.visitors / funnelTop) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {stats.features && (
                <>
                  <h3 className="h-display mt-8 text-2xl">Features</h3>
                  <p className="text-sm text-cream/65">How the interactive parts of the site are used.</p>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <BarList title="Boarding passes printed" note="Your Life, by destination." rows={stats.features.prints.map((c) => ({ ...c, name: names[c.name] || c.name }))} />
                    <BarList title="Home page gates" note="Which 'Your turn to take off' gate people picked." rows={stats.features.gates} color="#E84A7F" />
                    <BarList title="Globe spins" note="Drags on the home page globe." rows={stats.features.spins} color="#8A5CF6" />
                    <BarList title="Comparisons run" rows={stats.features.compares} color="#FF7A45" />
                    <BarList title="Play Zone games" rows={stats.features.games} color="#FFC9A8" />
                    <BarList title="Story cards downloaded" rows={stats.features.shares} color="#FFB72B" />
                  </div>
                </>
              )}

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <BarList title="What people pressed" note="Every button and link, by its label." rows={stats.clicks} />
                <BarList title="Events" note="Every tracked interaction." rows={stats.events} color="#8A5CF6" />
                <BarList title="Countries opened" rows={stats.countries.map((c) => ({ ...c, name: names[c.name] || c.name }))} color="#E84A7F" />
                <BarList title="Sections seen" note="Blocks that scrolled into view." rows={stats.sections} color="#FF7A45" />
                <BarList title="Where visits came from" note="UTM source, else the referring site, else direct." rows={stats.sources} color="#FFC9A8" />
                <BarList title="Devices" rows={stats.devices} color="#8A5CF6" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
