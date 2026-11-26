'use client';

/**
 * EXPLORE: the interactive globe, kept from v8 and made brighter.
 *
 *  - Drag to spin, pinch or use the buttons to zoom.
 *  - Every country has a flag pin. Hover (or tap) shows a card with the
 *    capital, population, area and one interesting fact.
 *  - The slider underneath has a photo of every country. Picking one turns
 *    the globe to it and circles it; the card then offers "Explore".
 *  - Globe / Flat map toggle: the same countries on an unrolled map, with
 *    the same hover cards and the same slider.
 *
 * The 3D code loads only when this section is near the screen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { flagSrc } from '@/components/Flag';
import { track } from '@/lib/analytics';
import { pexels } from '@/data/places';
import type { FlightWorld as FW, Frame } from '@/components/flight/world';

export interface ExploreCountry {
  slug: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
  capital: string;
  population: string;
  area: string;
  fact: string;
  photo: number;
  photoAlt: string;
  spot: string;
}

const TEXTURES = { day: '/textures/earth-day.webp', night: '/textures/earth-night.webp' };
const IDLE = 0.09;
const ZMIN = 1;
const ZMAX = 2.6;
const DEG = Math.PI / 180;
// The flat map is cropped to 75°N to 45°S, so it is 3:1.
const N = 75;
const S = -45;

type Pt = { x: number; y: number; visible: boolean };

export default function GlobeExplorer({ countries, startIndex }: { countries: ExploreCountry[]; startIndex: number }) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pins = useRef<(HTMLButtonElement | null)[]>([]);
  const card = useRef<HTMLDivElement>(null);
  const track$ = useRef<HTMLDivElement>(null);
  const worldRef = useRef<FW | null>(null);
  const pts = useRef<Pt[]>(countries.map(() => ({ x: 0, y: 0, visible: false })));
  const spin = useRef({ x: 0, y: 0, v: IDLE, dragging: false, lastX: 0, lastY: 0, lastT: 0, moved: 0, goal: null as null | { x: number; y: number } });
  const zoomRef = useRef(1);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const activeRef = useRef<number | null>(null);
  const modeRef = useRef<'globe' | 'flat'>('globe');

  const [mode, setMode] = useState<'globe' | 'flat'>('globe');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [zoom, setZoomState] = useState(1);

  const active = hover ?? pick;
  activeRef.current = active;
  modeRef.current = mode;

  const setZoom = useCallback((z: number) => {
    const v = Math.min(ZMAX, Math.max(ZMIN, z));
    zoomRef.current = v;
    setZoomState(v);
  }, []);

  /** Turn the globe so a country faces the viewer. */
  const faceCountry = useCallback(
    (i: number) => {
      const s = spin.current;
      const c = countries[i];
      const home = countries[startIndex];
      let gx = (home.lng - c.lng) * DEG;
      // take the short way round
      while (gx - s.x > Math.PI) gx -= 2 * Math.PI;
      while (gx - s.x < -Math.PI) gx += 2 * Math.PI;
      const gy = Math.max(-1.05, Math.min(1.05, c.lat * DEG - home.lat * DEG * 0.75));
      s.goal = { x: gx, y: gy };
      s.v = 0;
    },
    [countries, startIndex],
  );

  const choose = useCallback(
    (i: number, where: string) => {
      setPick(i);
      setHover(null);
      if (worldRef.current) worldRef.current.highlight = i;
      faceCountry(i);
      if (zoomRef.current < 1.35) setZoom(1.35);
      track('map_country_opened', { country: countries[i].slug, where });
      // keep the slider in step
      const el = track$.current?.querySelector<HTMLElement>(`[data-i="${i}"]`);
      if (el && track$.current) {
        const t = track$.current;
        t.scrollTo({ left: el.offsetLeft - t.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
      }
    },
    [countries, faceCountry, setZoom],
  );

  /* ------------------------------ 3D globe ------------------------------ */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let world: FW | null = null;
    let raf = 0;
    let visible = false;
    let disposed = false;
    let last = performance.now();
    let base = 1;
    const frame: Frame = { progress: 0, free: 1, x: 0, y: 0, scale: 1, dragX: 0, dragY: 0, time: 0 };
    const disc = { x: 0, y: 0, r: 1 };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const fit = () => {
      if (!world || !canvas.current) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      world.resize(w, h, Math.min(2, window.devicePixelRatio || 1));
      frame.scale = 1;
      world.render(frame);
      world.disc(disc);
      base = (Math.min(w, h) * (w < 640 ? 0.44 : 0.41)) / disc.r;
    };

    const placeCard = () => {
      const c = card.current;
      const a = activeRef.current;
      if (!c || a === null || modeRef.current !== 'globe') return;
      const p = pts.current[a];
      const w = el.clientWidth;
      if (w < 768) return; // phones: the card is docked under the globe
      const cw = c.offsetWidth;
      const ch = c.offsetHeight;
      const right = p.x + 28 + cw < w - 12;
      const x = right ? p.x + 28 : p.x - 28 - cw;
      const y = Math.max(12, Math.min(el.clientHeight - ch - 12, p.y - ch / 2));
      c.style.transform = `translate(${x}px, ${y}px)`;
      c.style.opacity = p.visible ? '1' : '0';
    };

    const tick = (now: number) => {
      raf = 0;
      if (!world || disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = spin.current;
      if (s.goal && !s.dragging) {
        const k = 1 - Math.exp(-dt * 4.5);
        s.x += (s.goal.x - s.x) * k;
        s.y += (s.goal.y - s.y) * k;
        if (Math.abs(s.goal.x - s.x) < 0.001 && Math.abs(s.goal.y - s.y) < 0.001) s.goal = null;
      } else if (!s.dragging) {
        const target = reduce || activeRef.current !== null ? 0 : IDLE;
        s.v += (target - s.v) * Math.min(1, dt * 1.5);
        s.x += s.v * dt;
      }
      frame.time = now / 1000;
      frame.dragX = s.x;
      frame.dragY = s.y;
      // ease the zoom
      const zNow = frame.scale / base || 1;
      const z = zNow + (zoomRef.current - zNow) * Math.min(1, dt * 8);
      frame.scale = base * z;
      world.render(frame);
      pins.current.forEach((pin, i) => {
        if (!pin) return;
        const p = pts.current[i];
        world!.project(i, p);
        const inside = p.x > -20 && p.y > -20 && p.x < el.clientWidth + 20 && p.y < el.clientHeight + 20;
        p.visible = p.visible && inside;
        pin.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) scale(${p.visible ? 1 : 0})`;
        pin.style.pointerEvents = p.visible ? 'auto' : 'none';
      });
      placeCard();
      if (visible && modeRef.current === 'globe') raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (world && !raf && visible) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const start = () => {
      if (world || disposed) return;
      import('@/components/flight/world')
        .then((mod) => {
          if (disposed || !canvas.current) return;
          const places = countries.map((c) => ({ lat: c.lat, lng: c.lng }));
          world = new mod.FlightWorld(canvas.current, places, [startIndex, (startIndex + 1) % places.length], TEXTURES, 'bright');
          worldRef.current = world;
          fit();
          frame.scale = base;
          setReady(true);
          kick();
        })
        .catch(() => setFailed(true));
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) {
          start();
          kick();
        }
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
    const ro = new ResizeObserver(() => {
      fit();
      kick();
    });
    ro.observe(el);
    const onKick = () => kick();
    el.addEventListener('globe:kick', onKick);
    return () => {
      disposed = true;
      io.disconnect();
      ro.disconnect();
      el.removeEventListener('globe:kick', onKick);
      cancelAnimationFrame(raf);
      world?.dispose();
      worldRef.current = null;
    };
  }, [countries, startIndex]);

  // Coming back from the flat map: restart the frame loop.
  useEffect(() => {
    if (mode === 'globe') stage.current?.dispatchEvent(new Event('globe:kick'));
  }, [mode]);

  /* --------------------------- Drag and pinch --------------------------- */
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.current.size === 2) {
      const [a, b] = [...touches.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoomRef.current };
      spin.current.dragging = false;
      return;
    }
    const s = spin.current;
    s.dragging = true;
    s.goal = null;
    s.moved = 0;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.lastT = performance.now();
    s.v = 0;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (touches.current.has(e.pointerId)) touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && touches.current.size === 2) {
      const [a, b] = [...touches.current.values()];
      setZoom(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d));
      return;
    }
    const s = spin.current;
    if (!s.dragging) return;
    const now = performance.now();
    const z = zoomRef.current;
    const dx = (e.clientX - s.lastX) / (170 * z);
    const dy = (e.clientY - s.lastY) / (230 * z);
    const dt = Math.max(0.001, (now - s.lastT) / 1000);
    s.x += dx;
    s.y = Math.max(-1.05, Math.min(1.05, s.y + dy));
    s.v = s.v * 0.5 + Math.max(-6, Math.min(6, dx / dt)) * 0.5;
    s.moved += Math.abs(e.clientX - s.lastX) + Math.abs(e.clientY - s.lastY);
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.lastT = now;
  };
  const up = (e: React.PointerEvent) => {
    touches.current.delete(e.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    const s = spin.current;
    if (s.dragging && s.moved > 6) track('globe_spun', { where: 'home-explore' });
    s.dragging = false;
  };
  // Trackpad pinch (ctrl + wheel) zooms; a plain wheel keeps scrolling the page.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoom(zoomRef.current * Math.exp(-e.deltaY * 0.01));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setZoom]);

  /* ------------------------------- Slider ------------------------------- */
  const drag = useRef<{ x: number; left: number; moved: number } | null>(null);
  const sliderDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !track$.current) return;
    drag.current = { x: e.clientX, left: track$.current.scrollLeft, moved: 0 };
  };
  const sliderMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !track$.current) return;
    d.moved = Math.abs(e.clientX - d.x);
    if (d.moved > 4) {
      track$.current.classList.add('is-dragging');
      track$.current.scrollLeft = d.left - (e.clientX - d.x);
    }
  };
  const sliderUp = () => {
    setTimeout(() => {
      drag.current = null;
    }, 0);
    track$.current?.classList.remove('is-dragging');
  };
  const page = (dir: number) => {
    const t = track$.current;
    if (!t) return;
    t.scrollBy({ left: dir * Math.max(240, t.clientWidth * 0.7), behavior: 'smooth' });
  };

  const info = active !== null ? countries[active] : null;

  return (
    <div>
      {/* Header row: title on the left, Globe / Flat map on the right */}
      <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="explore-kicker">
            <span aria-hidden className="explore-kicker-dot" />
            Explore the world · {countries.length} countries
          </p>
          <h2 id="explore-title" className="h-display mt-3 text-[2.2rem] leading-[1.02] text-ink sm:text-[3.4rem]">
            Spin it. Zoom in. <span className="text-[#EE5541]">Pick a place.</span>
          </h2>
        </div>
        <div className="view-toggle" role="group" aria-label="Map view">
          {(['globe', 'flat'] as const).map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'globe' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              )}
              {m === 'globe' ? 'Globe' : 'Flat map'}
            </button>
          ))}
        </div>
      </div>

      {/* The stage */}
      <div className="explore-stage relative mt-7 overflow-hidden rounded-[2rem] sm:mt-9">
        {/* Globe */}
        <div
          ref={stage}
          className={`relative h-[min(78vw,30rem)] w-full touch-none select-none sm:h-[34rem] lg:h-[38rem] ${mode === 'globe' ? '' : 'hidden'}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          <canvas ref={canvas} aria-hidden className={`absolute inset-0 h-full w-full cursor-grab transition-opacity duration-700 active:cursor-grabbing ${ready ? 'opacity-100' : 'opacity-0'}`} />
          {!ready && !failed && <div aria-hidden className="explore-placeholder absolute left-1/2 top-1/2 aspect-square w-[min(70%,26rem)] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full" />}
          {countries.map((c, i) => (
            <button
              key={c.slug}
              ref={(el) => {
                pins.current[i] = el;
              }}
              onClick={() => choose(i, 'home-globe')}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className={`explore-pin absolute left-0 top-0 ${pick === i ? 'is-picked' : ''} ${zoom >= 1.6 || pick === i ? 'show-label' : ''}`}
              style={{ transform: 'scale(0)' }}
              aria-label={`${c.name}: show facts`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagSrc(c.slug)} alt="" width={26} height={26} draggable={false} />
              <span className="explore-pin-label">{c.name}</span>
            </button>
          ))}

          {/* Floating info card (laptops) */}
          {info && (
            <div ref={card} className="explore-card pointer-events-none absolute left-0 top-0 z-20 hidden md:block" style={{ opacity: 0 }}>
              <InfoCard c={info} picked={pick === active} />
            </div>
          )}

          {/* Zoom */}
          <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
            <button className="zoom-btn" onClick={() => setZoom(zoomRef.current * 1.3)} aria-label="Zoom in" disabled={zoom >= ZMAX - 0.01}>
              +
            </button>
            <button className="zoom-btn" onClick={() => setZoom(zoomRef.current / 1.3)} aria-label="Zoom out" disabled={zoom <= ZMIN + 0.01}>
              −
            </button>
            <button
              className="zoom-btn text-[0.7rem]"
              onClick={() => {
                setZoom(1);
                setPick(null);
                if (worldRef.current) worldRef.current.highlight = -1;
                spin.current.goal = null;
                spin.current.v = IDLE;
              }}
              aria-label="Reset the view"
            >
              ⟲
            </button>
          </div>
          <p className="pointer-events-none absolute bottom-4 left-4 z-10 hidden rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-ink/70 shadow-sm backdrop-blur sm:block">
            Drag to spin · pinch or + to zoom · tap a flag
          </p>
        </div>

        {/* Flat map */}
        {mode === 'flat' && <FlatMap countries={countries} pick={pick} hover={hover} setHover={setHover} choose={choose} zoom={zoom} setZoom={setZoom} />}
      </div>

      {/* Docked info card (phones, and the flat map on every screen) */}
      {info && (
        <div className={`mt-4 ${mode === 'globe' ? 'md:hidden' : ''}`} aria-live="polite">
          <InfoCard c={info} picked={pick === active} wide />
        </div>
      )}

      {/* Country discovery slider */}
      <div className="mt-8 sm:mt-10">
        <div className="flex items-end justify-between gap-4">
          <p className="text-sm font-extrabold uppercase tracking-[0.16em] text-ink/55">Discover a country</p>
          <div className="flex gap-2">
            <button className="slider-arrow" onClick={() => page(-1)} aria-label="Previous countries">
              ←
            </button>
            <button className="slider-arrow" onClick={() => page(1)} aria-label="Next countries">
              →
            </button>
          </div>
        </div>
        <div
          ref={track$}
          className="slider-track mt-4"
          onPointerDown={sliderDown}
          onPointerMove={sliderMove}
          onPointerUp={sliderUp}
          onPointerLeave={sliderUp}
          role="list"
          aria-label="Countries"
        >
          {countries.map((c, i) => (
            <div role="listitem" key={c.slug} data-i={i} className="slider-item">
              <button
                className={`slider-card ${pick === i ? 'is-picked' : ''}`}
                aria-pressed={pick === i}
                onClick={(e) => {
                  if (drag.current && drag.current.moved > 4) {
                    e.preventDefault();
                    return;
                  }
                  choose(i, 'home-slider');
                }}
              >
                <span className="slider-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={pexels(c.photo, 520)} alt={c.photoAlt} loading="lazy" decoding="async" draggable={false} />
                  <span className="slider-spot">{c.spot}</span>
                </span>
                <span className="flex items-center gap-2.5 px-4 pb-4 pt-3.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flagSrc(c.slug)} alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-full object-cover ring-2 ring-white" draggable={false} />
                  <span className="text-left">
                    <span className="block text-[1.05rem] font-extrabold leading-tight text-ink">{c.name}</span>
                    <span className="block text-xs font-semibold text-ink/55">{c.region}</span>
                  </span>
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------- The info card --------------------------- */
function InfoCard({ c, picked, wide = false }: { c: ExploreCountry; picked: boolean; wide?: boolean }) {
  return (
    <article className={`info-card ${wide ? 'is-wide' : ''}`}>
      <header className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={flagSrc(c.slug)} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
        <div className="min-w-0">
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ink/50">{c.region}</p>
          <h3 className="h-display truncate text-[1.6rem] leading-none text-ink">{c.name}</h3>
        </div>
      </header>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {[
          ['Capital', c.capital],
          ['Population', c.population.replace(/^About /, '')],
          ['Area', c.area],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-[#FFF3E6] px-2.5 py-2">
            <dt className="text-[0.62rem] font-bold uppercase tracking-wider text-ink/50">{k}</dt>
            <dd className="mt-0.5 text-[0.8rem] font-extrabold leading-snug text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 rounded-xl bg-[#E4F6F7] px-3 py-2.5 text-[0.85rem] leading-snug text-ink/85">
        <span className="mr-1 font-extrabold text-[#0F8C93]">Did you know?</span>
        {c.fact}
      </p>
      {picked ? (
        <Link href={`/countries/${c.slug}`} className="explore-more pointer-events-auto mt-4">
          Explore {c.name} <span aria-hidden>→</span>
        </Link>
      ) : (
        <p className="mt-3 text-xs font-semibold text-ink/45">Click the flag to open {c.name}</p>
      )}
    </article>
  );
}

/* ------------------------------ Flat map ------------------------------ */
function FlatMap({
  countries,
  pick,
  hover,
  setHover,
  choose,
  zoom,
  setZoom,
}: {
  countries: ExploreCountry[];
  pick: number | null;
  hover: number | null;
  setHover: (i: number | null) => void;
  choose: (i: number, where: string) => void;
  zoom: number;
  setZoom: (z: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const focus = pick ?? hover;
  const fx = focus !== null ? ((countries[focus].lng + 180) / 360) * 100 : 50;
  const fy = focus !== null ? ((N - countries[focus].lat) / (N - S)) * 100 : 50;
  // Start phones on Europe, Africa and Asia.
  useEffect(() => {
    const el = box.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth * (215 / 360) - el.clientWidth / 2;
  }, []);
  // Keep the picked country in view on phones.
  useEffect(() => {
    const el = box.current;
    if (el && pick !== null && el.scrollWidth > el.clientWidth) el.scrollTo({ left: (el.scrollWidth * fx) / 100 - el.clientWidth / 2, behavior: 'smooth' });
  }, [pick, fx]);

  return (
    <div className="relative">
      <div ref={box} className="flat-scroll overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
        <div className="flat-frame relative aspect-[3/1] min-w-[56rem] overflow-hidden md:min-w-0">
          <div className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `scale(${zoom})`, transformOrigin: `${fx}% ${fy}%` }}>
            {/* the full 2:1 picture, cropped to 75°N to 45°S */}
            <div className="absolute inset-x-0" style={{ top: `${(-(90 - N) / (N - S)) * 100}%`, height: `${(180 / (N - S)) * 100}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/textures/earth-day.webp" alt="" className="flat-img block h-full w-full" draggable={false} />
            </div>
            {countries.map((c, i) => (
              <button
                key={c.slug}
                onClick={() => choose(i, 'home-flat')}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
                onPointerLeave={() => setHover(null)}
                className={`explore-pin flat absolute ${pick === i ? 'is-picked show-label' : ''} ${hover === i ? 'show-label' : ''}`}
                style={{ left: `${((c.lng + 180) / 360) * 100}%`, top: `${((N - c.lat) / (N - S)) * 100}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
                aria-label={`${c.name}: show facts`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagSrc(c.slug)} alt="" width={26} height={26} draggable={false} />
                <span className="explore-pin-label">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button className="zoom-btn" onClick={() => setZoom(zoom * 1.3)} aria-label="Zoom in" disabled={zoom >= ZMAX - 0.01}>
          +
        </button>
        <button className="zoom-btn" onClick={() => setZoom(zoom / 1.3)} aria-label="Zoom out" disabled={zoom <= ZMIN + 0.01}>
          −
        </button>
      </div>
    </div>
  );
}
