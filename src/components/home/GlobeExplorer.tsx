'use client';

/**
 * EXPLORE: the original v8 globe (FlightWorld, unchanged look) in a deep
 * observatory frame on a bright ivory stage, a flat map, an always visible
 * country card and a country slider, all kept in step.
 *
 *  - India is picked on load, so the country card is full from the start.
 *  - Hovering a pin previews that country in the card; clicking a pin, a
 *    slider card or a hero island picks it: the globe springs round to it,
 *    rings it in coral and the slider centres its card.
 *  - Drag to spin; pinch, ctrl + wheel or the buttons to zoom. A plain
 *    wheel always scrolls the page.
 *  - Globe and Flat map share the pick, the hover preview and the card. The
 *    flat map draws a curved flight arc from the last pick to the new one.
 *
 * The 3D code loads as soon as the page is idle and draws only while the
 * section is on screen.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
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
  language: string;
  /** Typical weekly working hours (an estimate). */
  workHours: number;
}

const TEXTURES = { day: '/textures/earth-day.webp', night: '/textures/earth-night.webp' };
const IDLE = 0.08;
const ZMIN = 1;
const ZMAX = 2.6;
const DEG = Math.PI / 180;
// The flat map is cropped to 75°N to 45°S, so it is 3:1.
const N = 75;
const S = -45;
const EASE = [0.23, 1, 0.32, 1] as const;
const SPRING = { type: 'spring', duration: 0.45, bounce: 0.18 } as const;

type Pt = { x: number; y: number; visible: boolean; depth?: number };
const fx = (c: ExploreCountry) => ((c.lng + 180) / 360) * 100;
const fy = (c: ExploreCountry) => ((N - c.lat) / (N - S)) * 100;

export default function GlobeExplorer({
  countries,
  startIndex,
  request = null,
}: {
  countries: ExploreCountry[];
  startIndex: number;
  /** A country picked elsewhere on the page (the hero). `n` changes on every pick. */
  request?: { slug: string; n: number } | null;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const frameEl = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pins = useRef<(HTMLButtonElement | null)[]>([]);
  const track$ = useRef<HTMLDivElement>(null);
  const worldRef = useRef<FW | null>(null);
  const pts = useRef<Pt[]>(countries.map(() => ({ x: 0, y: 0, visible: false, depth: 0 })));
  const spin = useRef({ x: 0, y: 0, v: IDLE, gvx: 0, gvy: 0, dragging: false, lastX: 0, lastY: 0, lastT: 0, moved: 0, goal: null as null | { x: number; y: number } });
  const sweep = useRef({ v: 0 });
  const zoomRef = useRef(1);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const activeRef = useRef<number | null>(startIndex);
  const pickRef = useRef<number | null>(startIndex);
  const modeRef = useRef<'globe' | 'flat'>('globe');

  const [mode, setMode] = useState<'globe' | 'flat'>('globe');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState<number>(startIndex);
  const [prevPick, setPrevPick] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [zoom, setZoomState] = useState(1);

  const active = hover ?? pick;
  activeRef.current = active;
  const hover$ = useRef<number | null>(null);
  hover$.current = hover;
  pickRef.current = pick;
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
      while (gx - s.x > Math.PI) gx -= 2 * Math.PI;
      while (gx - s.x < -Math.PI) gx += 2 * Math.PI;
      const gy = Math.max(-1.05, Math.min(1.05, c.lat * DEG - home.lat * DEG * 0.75));
      s.goal = { x: gx, y: gy };
      s.v = 0;
    },
    [countries, startIndex],
  );

  /** Centre a country's card in the slider. */
  const centreCard = useCallback((i: number) => {
    const t = track$.current;
    const el = t?.querySelector<HTMLElement>(`[data-i="${i}"]`);
    if (!t || !el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    t.scrollTo({ left: el.offsetLeft - (t.clientWidth - el.clientWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
  }, []);

  const choose = useCallback(
    (i: number, where: string) => {
      setPick((p) => {
        if (p !== i) setPrevPick(p);
        return i;
      });
      setHover(null);
      if (worldRef.current) worldRef.current.highlight = i;
      faceCountry(i);
      if (zoomRef.current < 1.3) setZoom(1.3);
      track('map_country_opened', { country: countries[i].slug, where });
      centreCard(i);
    },
    [countries, faceCountry, setZoom, centreCard],
  );

  // A country picked in the hero: turn to it here too.
  useEffect(() => {
    if (!request) return;
    const i = countries.findIndex((c) => c.slug === request.slug);
    if (i >= 0) choose(i, 'home-hero');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

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
    const order = countries.map((_, i) => i);
    const kept: number[] = [];

    const fit = () => {
      if (!world || !canvas.current) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      world.resize(w, h, Math.min(2, window.devicePixelRatio || 1));
      frame.scale = 1;
      world.render(frame);
      world.disc(disc);
      base = (Math.min(w, h) * (w < 640 ? 0.43 : 0.4)) / disc.r;
    };

    /** Pins grow with zoom; where two would pile up, the one further back becomes a dot. */
    const placePins = (z: number) => {
      const phone = el.clientWidth < 640;
      const size = (phone ? 22 : 26) * Math.min(1.3, 0.92 + (z - 1) * 0.3);
      const gap = size * 0.9;
      const pk = pickRef.current;
      const hv = activeRef.current;
      const rank = (i: number) => (i === pk ? 3 : i === hv ? 2 : 0) + (pts.current[i].depth ?? 0);
      order.sort((a, b) => rank(b) - rank(a));
      kept.length = 0;
      for (const i of order) {
        const pin = pins.current[i];
        if (!pin) continue;
        const p = pts.current[i];
        let s = 0;
        if (p.visible) {
          const crowded = kept.some((k) => Math.abs(pts.current[k].x - p.x) < gap && Math.abs(pts.current[k].y - p.y) < gap);
          s = crowded ? 0.36 : size / 26;
          if (!crowded) kept.push(i);
        }
        pin.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`;
        pin.style.pointerEvents = s > 0.5 ? 'auto' : 'none';
        pin.tabIndex = p.visible ? 0 : -1;
      }
    };

    const tick = (now: number) => {
      raf = 0;
      if (!world || disposed) return;
      const ms = now - last;
      const dt = Math.min(0.05, ms / 1000);
      last = now;
      if (world.adapt(ms)) fit();
      const s = spin.current;
      if (s.goal && !s.dragging) {
        if (reduce) {
          s.x = s.goal.x;
          s.y = s.goal.y;
          s.goal = null;
        } else {
          // a soft spring: a touch of overshoot, then settle
          s.gvx += ((s.goal.x - s.x) * 34 - s.gvx * 10.5) * dt;
          s.gvy += ((s.goal.y - s.y) * 34 - s.gvy * 10.5) * dt;
          s.x += s.gvx * dt;
          s.y += s.gvy * dt;
          if (Math.abs(s.goal.x - s.x) < 0.0008 && Math.abs(s.goal.y - s.y) < 0.0008 && Math.abs(s.gvx) + Math.abs(s.gvy) < 0.004) {
            s.goal = null;
            s.gvx = 0;
            s.gvy = 0;
          }
        }
      } else if (!s.dragging) {
        const target = reduce || hover$.current !== null ? 0 : IDLE;
        s.v += (target - s.v) * Math.min(1, dt * 1.5);
        s.x += s.v * dt;
      }
      frame.time = now / 1000;
      frame.dragX = s.x + sweep.current.v;
      frame.dragY = s.y;
      const zNow = frame.scale / base || 1;
      const z = zNow + (zoomRef.current - zNow) * Math.min(1, dt * 8);
      frame.scale = base * z;
      world.render(frame);
      for (let i = 0; i < countries.length; i++) {
        const p = pts.current[i];
        world.project(i, p);
        p.visible = p.visible && p.x > -20 && p.y > -20 && p.x < el.clientWidth + 20 && p.y < el.clientHeight + 20;
      }
      placePins(z);
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
          world = new mod.FlightWorld(canvas.current, places, [startIndex, (startIndex + 1) % places.length], TEXTURES);
          worldRef.current = world;
          world.highlight = pickRef.current ?? -1;
          fit();
          frame.scale = base;
          setReady(true);
          kick();
        })
        .catch(() => setFailed(true));
    };

    // Load the globe as soon as the page is idle, so it is already there when you arrive.
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const idle = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 1500 }) : window.setTimeout(start, 300);
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) {
          start();
          kick();
        }
      },
      { rootMargin: '120px 0px' },
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
      if (w.cancelIdleCallback) w.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
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

  /* ---------------------- Scroll entrance of the frame ---------------------- */
  useEffect(() => {
    const el = frameEl.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { y: 60, scale: 0.9 }, { y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 45%', scrub: 0.6 } });
      gsap.fromTo(sweep.current, { v: -1.1 }, { v: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 35%', scrub: 0.8, onUpdate: () => stage.current?.dispatchEvent(new Event('globe:kick')) } });
    }, el);
    return () => ctx.revert();
  }, []);

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
    s.gvx = 0;
    s.gvy = 0;
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
  // Mouse drag with momentum (touch already flicks natively).
  const drag = useRef<{ x: number; left: number; moved: number; v: number; t: number } | null>(null);
  const coast = useRef(0);
  const sliderDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !track$.current) return;
    cancelAnimationFrame(coast.current);
    drag.current = { x: e.clientX, left: track$.current.scrollLeft, moved: 0, v: 0, t: performance.now() };
  };
  const sliderMove = (e: React.PointerEvent) => {
    const d = drag.current;
    const t = track$.current;
    if (!d || !t) return;
    const now = performance.now();
    const prev = t.scrollLeft;
    d.moved = Math.max(d.moved, Math.abs(e.clientX - d.x));
    if (d.moved > 4) {
      t.classList.add('is-dragging');
      t.scrollLeft = d.left - (e.clientX - d.x);
      d.v = d.v * 0.4 + ((t.scrollLeft - prev) / Math.max(1, now - d.t)) * 0.6;
    }
    d.t = now;
  };
  const sliderUp = () => {
    const d = drag.current;
    const t = track$.current;
    if (d && t && d.moved > 4) {
      let v = d.v * 16;
      const run = () => {
        v *= 0.93;
        t.scrollLeft += v;
        if (Math.abs(v) > 0.4) coast.current = requestAnimationFrame(run);
        else t.classList.remove('is-dragging');
      };
      coast.current = requestAnimationFrame(run);
    } else t?.classList.remove('is-dragging');
    setTimeout(() => {
      drag.current = null;
    }, 0);
  };
  useEffect(() => () => cancelAnimationFrame(coast.current), []);
  const page = (dir: number) => {
    const t = track$.current;
    if (!t) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    t.scrollBy({ left: dir * Math.max(240, t.clientWidth * 0.7), behavior: reduce ? 'auto' : 'smooth' });
  };
  // Arrow keys walk the cards; Enter or Space picks one.
  const sliderKey = (e: React.KeyboardEvent) => {
    const from = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (!from) return;
    const i = Number(from.dataset.i);
    const to = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? countries.length - 1 : null;
    if (to === null || to < 0 || to >= countries.length) return;
    e.preventDefault();
    track$.current?.querySelector<HTMLElement>(`[data-i="${to}"] .slider-hit`)?.focus({ preventScroll: true });
    centreCard(to);
  };

  const switchMode = (m: 'globe' | 'flat') => {
    if (m === mode) return;
    setMode(m);
    track('map_toggled', { view: m, where: 'home-explore' });
  };

  const info = countries[active];

  return (
    <div>
      {/* Header row: title on the left, Globe / Flat map on the right */}
      <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
        <div className="min-w-0">
          <p className="explore-kicker">Twenty countries, one planet</p>
          <h2 id="explore-title" className="explore-title">
            <span className="inline-block">Spin it. Zoom in.</span> <span className="inline-block">Pick a place.</span>
          </h2>
        </div>
        <div className="view-toggle" role="group" aria-label="Map view">
          {(['globe', 'flat'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => switchMode(m)}>
              {mode === m && <motion.span layoutId="view-pill" className="view-pill" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative inline-flex items-center gap-2">
                {m === 'globe' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                    <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                )}
                {m === 'globe' ? '3D globe' : 'Flat map'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* The observatory and the country card */}
      <div className="mt-7 grid items-start gap-5 sm:mt-9 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)] lg:gap-6">
        <div ref={frameEl} className="observatory relative overflow-hidden">
          {/* Globe */}
          <motion.div
            ref={stage}
            initial={false}
            animate={{ opacity: mode === 'globe' ? 1 : 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className={`relative h-[min(96vw,30rem)] w-full touch-none select-none sm:h-[34rem] lg:h-[38rem] ${mode === 'globe' ? '' : 'hidden'}`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
          >
            <canvas ref={canvas} aria-hidden className={`absolute inset-0 h-full w-full cursor-grab transition-opacity duration-500 active:cursor-grabbing ${ready ? 'opacity-100' : 'opacity-0'}`} />
            {!ready && !failed && <div aria-hidden className="observatory-placeholder absolute left-1/2 top-1/2 aspect-square w-[min(80%,27rem)] -translate-x-1/2 -translate-y-1/2 rounded-full" />}
            {countries.map((c, i) => (
              <button
                key={c.slug}
                ref={(el) => {
                  pins.current[i] = el;
                }}
                type="button"
                tabIndex={-1}
                onClick={() => choose(i, 'home-globe')}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className={`explore-pin absolute left-0 top-0 ${pick === i ? 'is-picked show-label' : ''} ${hover === i ? 'show-label' : ''}`}
                style={{ transform: 'scale(0)' }}
                aria-label={`${c.name}: show facts`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagSrc(c.slug)} alt="" width={26} height={26} draggable={false} />
                <span className="explore-pin-label">{c.name}</span>
              </button>
            ))}
            <ZoomButtons
              zoom={zoom}
              setZoom={setZoom}
              reset={() => {
                setZoom(1);
                spin.current.goal = null;
                spin.current.v = IDLE;
              }}
            />
            <p className="observatory-hint pointer-events-none absolute bottom-4 left-4 z-10 hidden sm:block">Drag to spin, pinch to zoom, tap a flag</p>
          </motion.div>

          {/* Flat map */}
          {mode === 'flat' && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, ease: EASE }}>
              <FlatMap countries={countries} pick={pick} prev={prevPick} hover={hover} setHover={setHover} choose={choose} zoom={zoom} setZoom={setZoom} />
            </motion.div>
          )}
        </div>

        <CountryCard c={info} picked={active === pick} />
      </div>

      {/* Country discovery slider */}
      <div className="mt-9 sm:mt-12">
        <div className="flex items-end justify-between gap-4">
          <h3 className="slider-title">Discover a country</h3>
          <div className="flex gap-2">
            <button type="button" className="slider-arrow" onClick={() => page(-1)} aria-label="Previous countries">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="slider-arrow" onClick={() => page(1)} aria-label="Next countries">
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div ref={track$} className="slider-track relative mt-4" onPointerDown={sliderDown} onPointerMove={sliderMove} onPointerUp={sliderUp} onPointerLeave={sliderUp} onKeyDown={sliderKey} role="list" aria-label="Countries">
          {countries.map((c, i) => (
            <div role="listitem" key={c.slug} data-i={i} className="slider-item">
              <motion.div
                className={`slider-card ${pick === i ? 'is-picked' : ''}`}
                animate={{ scale: pick === i ? 1.05 : 1, y: pick === i ? -4 : 0 }}
                whileHover={{ y: -6 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              >
                <button
                  type="button"
                  className="slider-hit"
                  aria-pressed={pick === i}
                  aria-label={`${c.name}, ${c.spot}. Show on the map`}
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
                  </span>
                  <span className="flex items-center gap-3 px-4 pb-4 pt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flagSrc(c.slug)} alt="" width={26} height={26} className="slider-flag" draggable={false} />
                    <span className="min-w-0 text-left">
                      <span className="slider-name">{c.name}</span>
                      <span className="slider-region">{c.spot}</span>
                    </span>
                  </span>
                </button>
                {pick === i && (
                  <Link href={`/countries/${c.slug}`} className="slider-explore" onClick={() => track('explore_country_clicked', { country: c.slug, where: 'home-slider' })}>
                    Explore
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                )}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Zoom buttons ---------------------------- */
function ZoomButtons({ zoom, setZoom, reset }: { zoom: number; setZoom: (z: number) => void; reset?: () => void }) {
  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
      <button type="button" className="zoom-btn" onClick={() => setZoom(zoom * 1.3)} aria-label="Zoom in" disabled={zoom >= ZMAX - 0.01}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" className="zoom-btn" onClick={() => setZoom(zoom / 1.3)} aria-label="Zoom out" disabled={zoom <= ZMIN + 0.01}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </button>
      {reset && (
        <button type="button" className="zoom-btn" onClick={reset} aria-label="Reset the view">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* --------------------------- The country card --------------------------- */
function CountryCard({ c, picked }: { c: ExploreCountry; picked: boolean }) {
  return (
    <aside className="country-card" aria-live="polite" aria-label="Country facts">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={c.slug} initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }} transition={SPRING}>
          <div className="country-photo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pexels(c.photo, 820)} alt={c.photoAlt} decoding="async" />
            <span className="country-badge">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagSrc(c.slug)} alt="" width={22} height={22} />
              {c.region}
            </span>
            {!picked && <span className="country-preview">Preview</span>}
          </div>
          <div className="country-body">
            <h3 className="country-name">{c.name}</h3>
            <p className="country-spot">{c.spot}</p>
            <dl className="country-stats">
              {[
                ['Capital', c.capital],
                ['Population', c.population.replace(/^About /, '')],
                ['Area', c.area],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <dl className="country-snapshot">
              <div>
                <dt>Language</dt>
                <dd>{c.language}</dd>
              </div>
              <div>
                <dt>Work week</dt>
                <dd>About {c.workHours} hours</dd>
              </div>
            </dl>
            <p className="country-fact">
              <strong>Did you know?</strong> {c.fact}
            </p>
            <Link href={`/countries/${c.slug}`} className="country-cta" onClick={() => track('explore_country_clicked', { country: c.slug, where: 'home-card' })}>
              Explore {c.name}
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}

/* ------------------------------ Flat map ------------------------------ */
function FlatMap({
  countries,
  pick,
  prev,
  hover,
  setHover,
  choose,
  zoom,
  setZoom,
}: {
  countries: ExploreCountry[];
  pick: number;
  prev: number | null;
  hover: number | null;
  setHover: (i: number | null) => void;
  choose: (i: number, where: string) => void;
  zoom: number;
  setZoom: (z: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const focus = hover ?? pick;
  const ox = fx(countries[focus]);
  const oy = fy(countries[focus]);
  // Start on the picked country, then keep each new pick in view.
  useEffect(() => {
    const el = box.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollTo({ left: (el.scrollWidth * fx(countries[pick])) / 100 - el.clientWidth / 2, behavior: 'smooth' });
  }, [pick, countries]);
  // the flight arc from the last pick to this one, in a 300 x 100 box
  const arc = (() => {
    if (prev === null || prev === pick) return null;
    const a = countries[prev];
    const b = countries[pick];
    const x1 = fx(a) * 3;
    const y1 = fy(a);
    const x2 = fx(b) * 3;
    const y2 = fy(b);
    const lift = Math.min(30, Math.hypot(x2 - x1, y2 - y1) * 0.35);
    return `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - lift} ${x2} ${y2}`;
  })();

  return (
    <div className="relative">
      <div ref={box} className="flat-scroll overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
        <div className="flat-frame relative overflow-hidden">
          <div className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none" style={{ transform: `scale(${zoom})`, transformOrigin: `${ox}% ${oy}%` }}>
            {/* the full 2:1 picture, cropped to 75°N to 45°S */}
            <div className="absolute inset-x-0" style={{ top: `${(-(90 - N) / (N - S)) * 100}%`, height: `${(180 / (N - S)) * 100}%` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/textures/earth-day.webp" alt="" className="flat-img block h-full w-full" draggable={false} />
            </div>
            {arc && (
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden>
                <motion.path key={arc} d={arc} fill="none" stroke="#ffc233" strokeWidth="0.55" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.9, ease: EASE }} />
              </svg>
            )}
            {countries.map((c, i) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => choose(i, 'home-flat')}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className={`explore-pin flat absolute ${pick === i ? 'is-picked show-label' : ''} ${hover === i ? 'show-label' : ''}`}
                style={{ left: `${fx(c)}%`, top: `${fy(c)}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
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
      <ZoomButtons zoom={zoom} setZoom={setZoom} />
    </div>
  );
}
