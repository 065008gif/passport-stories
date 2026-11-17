'use client';

/**
 * The Countries page: twenty boarding-pass cards that can be filtered by
 * region, searched, and re-ranked by any everyday-life number. Cards slide
 * into their new places when the order changes.
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { flagSrc } from '@/components/Flag';
import { Tilt } from '@/components/Fx';
import { useBoard } from '@/components/FlightProvider';
import { track } from '@/lib/analytics';
import { usePassport } from '@/lib/passport';

export interface GridCountry {
  slug: string;
  name: string;
  airport: string;
  region: string;
  tagline: string;
  fact: string;
  /** metric key -> [value, display text] */
  stats: Record<string, [number, string]>;
}

export interface SortOption {
  key: string;
  label: string;
  emoji: string;
}

const ACCENTS = ['#FFB703', '#4CC9F0', '#06A77D', '#FB8500'];
const CHIP_COLORS = ['#FFB703', '#4CC9F0', '#06A77D', '#FB8500', '#FFB703', '#4CC9F0', '#06A77D'];

export default function CountryGrid({ countries, regions, sorts }: { countries: GridCountry[]; regions: string[]; sorts: SortOption[] }) {
  const board = useBoard();
  const { stamps } = usePassport();
  const [region, setRegion] = useState('All');
  const [sort, setSort] = useState('az');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = countries.filter((c) => (region === 'All' || c.region === region) && (!needle || c.name.toLowerCase().includes(needle) || c.airport.toLowerCase().includes(needle)));
    if (sort === 'az') out.sort((a, b) => a.name.localeCompare(b.name));
    else out.sort((a, b) => b.stats[sort][0] - a.stats[sort][0]);
    return out;
  }, [countries, region, sort, q]);

  const sortDef = sorts.find((s) => s.key === sort);
  const top = sort === 'az' ? 0 : Math.max(...list.map((c) => c.stats[sort][0]), 0.0001);
  const visited = countries.filter((c) => stamps[c.slug]).length;

  const pickRegion = (r: string) => {
    setRegion(r);
    track('filter_used', { filter: 'region', value: r });
  };
  const pickSort = (k: string) => {
    setSort(k);
    track('filter_used', { filter: 'sort', value: k });
  };

  return (
    <div data-section="country-grid">
      {/* Controls: two rows of colour chips, no scrolling */}
      <div className="relative z-10 -mt-10 rounded-[1.8rem] bg-ink p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="min-w-0 flex-1">
            <p className="chunk text-lg text-sun">Pick a region</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['All', ...regions].map((r, i) => {
                const n = r === 'All' ? countries.length : countries.filter((c) => c.region === r).length;
                return (
                  <button key={r} onClick={() => pickRegion(r)} aria-pressed={region === r} className="fchip" style={{ ['--c' as string]: CHIP_COLORS[i % CHIP_COLORS.length] }}>
                    <i aria-hidden />
                    {r}
                    <span className="font-mono text-xs opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <label className="relative w-full sm:w-64">
            <span className="sr-only">Find a country</span>
            <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-ink/60">
              ⌕
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a country…"
              className="h-12 w-full rounded-full border-2 border-cream/25 bg-cream pl-11 pr-4 text-base font-bold text-ink placeholder:font-semibold placeholder:text-ink/45 focus:border-sun"
            />
          </label>
        </div>
        <div className="mt-5 border-t-2 border-dashed border-cream/15 pt-4">
          <p className="chunk text-lg text-sky">Or rank them by</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {sorts.map((s, i) => (
              <button key={s.key} onClick={() => pickSort(s.key)} aria-pressed={sort === s.key} className="fchip" style={{ ['--c' as string]: CHIP_COLORS[(i + 2) % CHIP_COLORS.length] }}>
                <span aria-hidden>{s.emoji}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-cream/80" aria-live="polite">
        <span>
          {list.length} {list.length === 1 ? 'country' : 'countries'}
          {sortDef && sort !== 'az' ? `, ranked by ${sortDef.label.toLowerCase()}` : ''}
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-28 overflow-hidden rounded-full bg-cream/10">
            <span className="block h-full rounded-full bg-teal transition-all duration-700" style={{ width: `${(visited / countries.length) * 100}%` }} />
          </span>
          {visited}/{countries.length} stamped
        </span>
      </p>

      <motion.ul layout className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((c, i) => {
            const accent = ACCENTS[countries.indexOf(c) % ACCENTS.length];
            const stat = sort === 'az' ? null : c.stats[sort];
            return (
              <motion.li
                key={c.slug}
                layout
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30, delay: Math.min(i, 8) * 0.025 }}
              >
                <Tilt className="h-full rounded-[1.4rem]">
                  <a
                    href={`/countries/${c.slug}`}
                    data-track={`country-card:${c.slug}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                      e.preventDefault();
                      board(`/countries/${c.slug}`, { name: c.name, code: c.airport });
                    }}
                    className="ccard group"
                    style={{ ['--accent' as string]: accent }}
                  >
                    <div className="ccard-cover">
                      <img src={flagSrc(c.slug)} alt="" loading="lazy" className="ccard-wash" />
                      <img src={flagSrc(c.slug)} alt="" loading="lazy" className="ccard-sticker" />
                      {stat && (
                        <span className="absolute right-3 top-3 z-[2] flex h-9 min-w-9 items-center justify-center rounded-full bg-sun px-2 font-display text-lg font-extrabold text-ink shadow-[0_3px_0_#1b1f5e]">
                          #{i + 1}
                        </span>
                      )}
                      {stamps[c.slug] && (
                        <span className="absolute left-[6.6rem] bottom-3 z-[2] -rotate-6 rounded-md border-2 border-cream px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-cream">
                          ✓ Stamped
                        </span>
                      )}
                      <span className="ccard-code">{c.airport}</span>
                    </div>
                    <div className="ccard-tear" />
                    <div className="flex flex-1 flex-col px-5 pb-5 pt-2">
                      <p className="kicker text-cream/65">{c.region}</p>
                      <h3 className="chunk mt-1 text-[1.6rem]">{c.name}</h3>
                      <p className="mt-1.5 flex-1 text-[15px] leading-snug text-cream/85">{c.tagline}</p>

                      {stat ? (
                        <div className="mt-4">
                          <p className="flex items-baseline justify-between gap-2">
                            <span className="kicker text-cream/70">{sortDef?.label}</span>
                            <span className="h-display text-xl">{stat[1]}</span>
                          </p>
                          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-cream/10">
                            <motion.div className="h-full rounded-full" style={{ background: accent }} initial={{ width: 0 }} animate={{ width: `${Math.max(6, (stat[0] / top) * 100)}%` }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }} />
                          </div>
                        </div>
                      ) : (
                        <div className="ccard-peek">
                          <div>
                            <p className="mt-3 rounded-xl bg-night/70 p-3 text-[13px] font-semibold leading-snug text-cream">
                              <span className="kicker mb-0.5 block text-cream/70">Did you know?</span>
                              {c.fact}
                            </p>
                          </div>
                        </div>
                      )}

                      <p className="mt-4 flex items-center justify-between border-t-2 border-dashed border-cream/25 pt-3 font-mono text-sm font-semibold">
                        <span>DEL → {c.airport}</span>
                        <span className="flex items-center gap-1.5 rounded-full bg-sun px-3 py-1.5 text-ink transition-transform group-hover:scale-110">
                          Board
                          <svg className="ccard-plane" width="15" height="15" viewBox="0 0 24 24" aria-hidden>
                            <path d="M2 12 22 3l-5 18-5-7-10-2z" fill="currentColor" />
                          </svg>
                        </span>
                      </p>
                    </div>
                  </a>
                </Tilt>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>

      {list.length === 0 && (
        <p className="mt-10 rounded-2xl border-2 border-dashed border-cream/25 p-8 text-center text-lg font-semibold">
          No country matches “{q}”.{' '}
          <button className="underline underline-offset-4" onClick={() => { setQ(''); setRegion('All'); }}>
            Show all 20
          </button>
        </p>
      )}
    </div>
  );
}
