'use client';

/**
 * The Countries page as a World Explorer Directory: a compact, searchable,
 * filterable list of all twenty countries on the left and a large illustrated
 * cultural preview on the right that changes as you pick a country.
 * Search, region filters, rankings, the dice and the passport stamps all
 * keep working; Explore Country boards the existing country page.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { flagSrc } from '@/components/Flag';
import { useBoard } from '@/components/FlightProvider';
import { track } from '@/lib/analytics';
import { usePassport } from '@/lib/passport';
import { COUNTRY_PHOTOS, photoSet, photoUrl } from '@/components/countries/countryPhotos';
import type { SortOption } from '@/components/countries/CountryGrid';

export interface DirCountry {
  slug: string;
  name: string;
  airport: string;
  region: string;
  tagline: string;
  fact: string;
  weekend: string;
  capital: string;
  /** metric key -> [value, display text] */
  stats: Record<string, [number, string]>;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function CountryDirectory({ countries, regions, sorts }: { countries: DirCountry[]; regions: string[]; sorts: SortOption[] }) {
  const board = useBoard();
  const { stamps } = usePassport();
  const reduce = useReducedMotion();
  const [region, setRegion] = useState('All');
  const [sort, setSort] = useState('az');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(() => [...countries].sort((a, b) => a.name.localeCompare(b.name))[0]?.slug ?? '');
  const listRef = useRef<HTMLUListElement>(null);
  const artRef = useRef<HTMLDivElement>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = countries.filter((c) => (region === 'All' || c.region === region) && (!needle || c.name.toLowerCase().includes(needle) || c.airport.toLowerCase().includes(needle) || c.capital.toLowerCase().includes(needle)));
    if (sort === 'az') out.sort((a, b) => a.name.localeCompare(b.name));
    else out.sort((a, b) => b.stats[sort][0] - a.stats[sort][0]);
    return out;
  }, [countries, region, sort, q]);

  // the preview always shows a country that is in the list
  useEffect(() => {
    if (list.length && !list.some((c) => c.slug === sel)) setSel(list[0].slug);
  }, [list, sel]);

  // Roll the dice: pick a country here instead of leaving the page
  useEffect(() => {
    const onTeleport = (e: Event) => {
      const d = (e as CustomEvent<{ slug: string; handled: boolean }>).detail;
      if (!d || !countries.some((c) => c.slug === d.slug)) return;
      d.handled = true;
      setQ('');
      setRegion('All');
      setSel(d.slug);
      requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-slug="${d.slug}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' }));
    };
    window.addEventListener('ps:teleport', onTeleport);
    return () => window.removeEventListener('ps:teleport', onTeleport);
  }, [countries, reduce]);

  const c = list.find((x) => x.slug === sel) ?? list[0];
  const sortDef = sorts.find((s) => s.key === sort);
  const visited = countries.filter((x) => stamps[x.slug]).length;

  const pick = (slug: string) => {
    if (slug === sel) return;
    setSel(slug);
    track('picker_used', { picker: 'country-directory', country: slug });
  };
  const go = (x: DirCountry) => {
    track('explore_country_clicked', { country: x.slug, from: 'directory' });
    board(`/countries/${x.slug}`, { name: x.name, code: x.airport });
  };
  const onListKey = (e: React.KeyboardEvent) => {
    const i = list.findIndex((x) => x.slug === sel);
    let n = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = Math.min(list.length - 1, i + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = Math.max(0, i - 1);
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = list.length - 1;
    else if (e.key === 'Enter' && c) {
      e.preventDefault();
      go(c);
      return;
    }
    if (n < 0) return;
    e.preventDefault();
    pick(list[n].slug);
    const el = listRef.current?.querySelector<HTMLElement>(`[data-slug="${list[n].slug}"]`);
    el?.focus();
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };
  // gentle parallax: the photo leans a little toward the pointer
  const lean = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== 'mouse' || !artRef.current) return;
    const b = artRef.current.getBoundingClientRect();
    artRef.current.style.setProperty('--px', (((e.clientX - b.left) / b.width) * 2 - 1).toFixed(3));
    artRef.current.style.setProperty('--py', (((e.clientY - b.top) / b.height) * 2 - 1).toFixed(3));
  };
  const unlean = () => {
    artRef.current?.style.setProperty('--px', '0');
    artRef.current?.style.setProperty('--py', '0');
  };
  // warm the next photos so switching feels instant
  useEffect(() => {
    const i = list.findIndex((x) => x.slug === sel);
    [list[i + 1], list[i - 1]].forEach((x) => {
      const p = x && COUNTRY_PHOTOS[x.slug];
      if (p) new Image().src = photoUrl(p.id, 1280);
    });
  }, [list, sel]);

  return (
    <div data-section="country-directory">
      {/* controls: search, regions, ranking */}
      <div className="wx-controls">
        <label className="wx-search">
          <span className="sr-only">Find a country</span>
          <span aria-hidden className="wx-search-icon">⌕</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a country, city or airport…" />
        </label>
        <div className="wx-chips" role="group" aria-label="Region">
          {['All', ...regions].map((r) => {
            const n = r === 'All' ? countries.length : countries.filter((x) => x.region === r).length;
            return (
              <button key={r} type="button" aria-pressed={region === r} className="wx-chip" onClick={() => {
                setRegion(r);
                track('filter_used', { filter: 'region', value: r });
              }}>
                {r} <span>{n}</span>
              </button>
            );
          })}
        </div>
        <label className="wx-sort">
          <span className="sr-only">Rank countries by</span>
          <select value={sort} onChange={(e) => {
            setSort(e.target.value);
            track('filter_used', { filter: 'sort', value: e.target.value });
          }}>
            {sorts.map((s) => (
              <option key={s.key} value={s.key}>
                {s.emoji} {s.key === 'az' ? 'Sort: A to Z' : `Rank: ${s.label}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="wx-meta" aria-live="polite">
        <span>
          {list.length} {list.length === 1 ? 'country' : 'countries'}
          {sortDef && sort !== 'az' ? `, ranked by ${sortDef.label.toLowerCase()}` : ''}
        </span>
        <span className="wx-progress">
          <span><i style={{ width: `${(visited / countries.length) * 100}%` }} /></span>
          {visited}/{countries.length} stamped
        </span>
      </p>

      <div className="wx-layout">
        {/* the directory */}
        <ul ref={listRef} className="wx-list" role="listbox" aria-label="Countries" aria-activedescendant={c ? `wx-${c.slug}` : undefined} onKeyDown={onListKey}>
          {list.map((x, i) => {
            const on = x.slug === c?.slug;
            const stamped = !!stamps[x.slug];
            const stat = sort === 'az' ? null : x.stats[sort];
            return (
              <li key={x.slug} id={`wx-${x.slug}`} role="option" aria-selected={on} data-slug={x.slug} tabIndex={on ? 0 : -1} className={`wx-row ${on ? 'is-on' : ''} ${stamped ? 'is-stamped' : ''}`} onClick={() => pick(x.slug)} onDoubleClick={() => go(x)}>
                {stat && <span className="wx-rank">{i + 1}</span>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagSrc(x.slug)} alt="" width={30} height={30} className="wx-flag" />
                <span className="wx-name">
                  <b>{x.name}</b>
                  <small>{stat ? stat[1] : x.region}</small>
                </span>
                <span className={`wx-stamp ${stamped ? 'on' : ''}`} title={stamped ? 'Stamped in your passport' : 'Not visited yet'} aria-label={stamped ? 'Stamped' : 'Not visited yet'}>
                  {stamped ? '✓' : ''}
                </span>
                <a href={`/countries/${x.slug}`} className="wx-go" aria-label={`Open ${x.name}`} tabIndex={-1} onClick={(e) => {
                  e.stopPropagation();
                  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  go(x);
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </li>
            );
          })}
          {list.length === 0 && (
            <li className="wx-empty">
              No country matches “{q}”.{' '}
              <button type="button" onClick={() => {
                setQ('');
                setRegion('All');
              }}>
                Show all 20
              </button>
            </li>
          )}
        </ul>

        {/* the photographic preview */}
        <div role="region" className="wx-preview" aria-live="polite" aria-label={c ? `${c.name} preview` : 'Preview'} ref={artRef} onPointerMove={lean} onPointerLeave={unlean}>
          <AnimatePresence initial={false}>
            {c && (
              <motion.div key={c.slug} className="wx-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.15 : 0.7, ease: EASE }}>
                {COUNTRY_PHOTOS[c.slug] && (
                  <div className="wx-photo-wrap">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="wx-photo" src={photoUrl(COUNTRY_PHOTOS[c.slug].id, 1280)} srcSet={photoSet(COUNTRY_PHOTOS[c.slug].id)} sizes="(min-width: 1024px) 60vw, 100vw" alt={COUNTRY_PHOTOS[c.slug].alt} decoding="async" />
                  </div>
                )}
                <span className="wx-shade" aria-hidden />
                {stamps[c.slug] ? (
                  <span className="wx-seal" aria-label="Stamped in your passport">
                    <b>✓</b>
                    Stamped
                  </span>
                ) : (
                  <span className="wx-seal is-new">Not yet visited</span>
                )}
                <motion.div className="wx-body" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: reduce ? 0 : 0.12, ease: EASE }}>
                  <div className="wx-title">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flagSrc(c.slug)} alt="" width={40} height={40} />
                    <div>
                      <p className="wx-kicker">
                        {c.region} · {c.capital}
                      </p>
                      <h2>{c.name}</h2>
                    </div>
                  </div>
                  <p className="wx-caption">{COUNTRY_PHOTOS[c.slug]?.caption}</p>
                  <p className="wx-intro">{c.tagline}</p>
                  <p className="wx-fact">
                    <span>Did you know? </span>
                    {c.fact}
                  </p>
                  <div className="wx-actions">
                    <a href={`/countries/${c.slug}`} className="wx-cta" data-track={`country-card:${c.slug}`} onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                      e.preventDefault();
                      go(c);
                    }}>
                      Explore {c.name}
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                        <path d="M2 12 22 3l-5 18-5-7-10-2z" fill="currentColor" />
                      </svg>
                    </a>
                    {COUNTRY_PHOTOS[c.slug] && (
                      <a className="wx-credit" href={`https://www.pexels.com/photo/${COUNTRY_PHOTOS[c.slug].id}/`} target="_blank" rel="noopener noreferrer">
                        Photo: {COUNTRY_PHOTOS[c.slug].credit} / Pexels
                      </a>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
