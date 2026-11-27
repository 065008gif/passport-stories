'use client';

/**
 * EXPLORE: the original v8 globe (FlightWorld, unchanged look) on a full
 * width observatory stage, a flat world map, a tethered passport ticket and
 * a country slider, all kept in step.
 *
 *  - At rest the stage is open: the Earth fills about four fifths of the
 *    stage height, poles clear, continents easy to read.
 *  - A miniature jet, the hero jet's little sibling, glides down from the top
 *    of the globe when the section arrives, then follows the cursor across the
 *    globe (and only the globe) on great circles, parks beside any flag you
 *    hover, and flies a glowing arc to every country you pick. On the flat
 *    map an SVG jet follows the cursor with a fading dotted trail.
 *  - Hover a beacon (globe or flat map) and a passport ticket springs out
 *    beside it on a glowing tether. A short grace period lets the pointer
 *    travel from the beacon onto the ticket.
 *  - Click a beacon, a slider card or a hero island: the globe springs to
 *    the country, draws a flight arc from the last pick, and locks the
 *    ticket open (x, Escape, a drag or a tap on the stage closes it).
 *  - Phones get the ticket as a sheet over the bottom of the stage.
 *  - Drag to spin; pinch, ctrl + wheel or the buttons to zoom. A plain
 *    wheel always scrolls the page.
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
import { jetSeam } from '@/components/home/jetSeam';
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
  airport: string;
}

const TEXTURES = { day: '/textures/earth-day.webp', night: '/textures/earth-night.webp' };
const IDLE = 0.08;
const ZMIN = 1;
const ZMAX = 2.3;
const DEG = Math.PI / 180;
// The flat map is cropped to 75°N to 45°S, so it is 3:1.
const N = 75;
const S = -45;
const EASE = [0.23, 1, 0.32, 1] as const;
const GRACE = 220;

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
  const stageEl = useRef<HTMLDivElement>(null);
  const globeEl = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pins = useRef<(HTMLButtonElement | null)[]>([]);
  const flatPins = useRef<(HTMLButtonElement | null)[]>([]);
  const ticketEl = useRef<HTMLDivElement>(null);
  const tether = useRef<SVGLineElement>(null);
  const tetherDot = useRef<SVGCircleElement>(null);
  const track$ = useRef<HTMLDivElement>(null);
  const worldRef = useRef<FW | null>(null);
  const pts = useRef<Pt[]>(countries.map(() => ({ x: 0, y: 0, visible: false, depth: 0 })));
  const spin = useRef({ x: 0, y: 0, v: IDLE, gvx: 0, gvy: 0, dragging: false, lastX: 0, lastY: 0, lastT: 0, moved: 0, goal: null as null | { x: number; y: number } });
  const sweep = useRef({ v: 0 });
  const zoomRef = useRef(1);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const closeTimer = useRef(0);

  const [mode, setMode] = useState<'globe' | 'flat'>('globe');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState<number | null>(null);
  const [locked, setLocked] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [zoom, setZoomState] = useState(1);
  const [narrow, setNarrow] = useState(false);
  const [hinted, setHinted] = useState(false);

  const ticket = hover ?? locked;
  const refs = useRef({ pick, ticket, mode, hover });
  refs.current = { pick, ticket, mode, hover };

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const setZoom = useCallback((z: number) => {
    const v = Math.min(ZMAX, Math.max(ZMIN, z));
    zoomRef.current = v;
    setZoomState(v);
  }, []);

  /* ---------------------------- Hover with a grace period ---------------------------- */
  const openHover = useCallback((i: number) => {
    window.clearTimeout(closeTimer.current);
    setHover(i);
    setHinted(true);
    const w = worldRef.current;
    if (w && refs.current.mode === 'globe') {
      w.guideBeside(i);
      w.highlight = i; // a coral landing ring at the hovered flag
    }
  }, []);
  const closeSoon = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setHover(null);
      if (worldRef.current) worldRef.current.highlight = refs.current.pick ?? -1;
    }, GRACE);
  }, []);
  /** The pointer is on the ticket: keep it open and let the jet hold still. */
  const keepOpen = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    worldRef.current?.guideAim(null);
  }, []);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

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
      setPick(i);
      setLocked(i);
      setHover(null);
      setHinted(true);
      const w = worldRef.current;
      if (w) {
        w.highlight = i;
        w.guideFly(i);
      }
      faceCountry(i);
      track('map_country_opened', { country: countries[i].slug, where });
      centreCard(i);
    },
    [countries, faceCountry, centreCard],
  );
  const dismiss = useCallback(() => {
    setLocked(null);
    setHover(null);
  }, []);

  // A country picked in the hero: turn to it here too.
  useEffect(() => {
    if (!request) return;
    const i = countries.findIndex((c) => c.slug === request.slug);
    if (i >= 0) choose(i, 'home-hero');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismiss();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss]);

  /* ------------------------------ 3D globe ------------------------------ */
  useEffect(() => {
    const el = globeEl.current;
    if (!el) return;
    let world: FW | null = null;
    let raf = 0;
    let visible = false;
    let disposed = false;
    let last = performance.now();
    let base = 1;
    // the one jet: hidden until the seam bridge lands it here, hidden again when it lifts off
    let unseam: (() => void) | null = null;
    const frame: Frame = { progress: 0, free: 1, x: 0, y: 0, scale: 1, dragX: 0, dragY: 0, time: 0 };
    const disc = { x: 0, y: 0, r: 1 };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const order = countries.map((_, i) => i);
    const kept: number[] = [];

    // Framing: the Earth fills about 81% of the stage height, never more than 90%
    // of its width, so the poles stay clear.
    const fit = () => {
      if (!world || !canvas.current) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      world.resize(w, h, Math.min(2, window.devicePixelRatio || 1));
      frame.scale = 1;
      world.render(frame);
      world.disc(disc);
      // the Earth fills about 81% of the stage height (never wider than 90% of it)
      base = Math.min(h * 0.405, w * 0.45) / disc.r;
    };
    // test hook: the Earth's measured diameter against the stage height
    (window as unknown as { __globeDisc?: () => unknown }).__globeDisc = () => {
      if (!world) return null;
      const d = { x: 0, y: 0, r: 0 };
      world.disc(d);
      const cr = canvas.current?.getBoundingClientRect();
      return { diameter: Math.round(d.r * 2), stage: el.clientHeight, ratio: +((d.r * 2) / el.clientHeight).toFixed(3), cx: Math.round((cr?.left ?? 0) + d.x), cy: Math.round((cr?.top ?? 0) + d.y) };
    };
    // test hook: is the globe's own jet showing?
    (window as unknown as { __globeJet?: () => unknown }).__globeJet = () => world?.guideVisible ?? null;
    (window as unknown as { __globeJetPose?: () => unknown }).__globeJetPose = () => {
      const t = world?.guidePose();
      const cv = canvas.current;
      if (!t || !cv) return null;
      const r = cv.getBoundingClientRect();
      return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) };
    };

    /** Beacons grow with zoom and fade near the back limb; crowded ones shrink to a dot. */
    const placePins = (z: number) => {
      const phone = el.clientWidth < 640;
      const size = (phone ? 20 : 24) * Math.min(1.3, 0.92 + (z - 1) * 0.3);
      const gap = size * 0.9;
      const { pick: pk, hover: hv } = refs.current;
      const rank = (i: number) => (i === pk ? 3 : i === hv ? 2 : 0) + (pts.current[i].depth ?? 0);
      order.sort((a, b) => rank(b) - rank(a));
      kept.length = 0;
      for (const i of order) {
        const pin = pins.current[i];
        if (!pin) continue;
        const p = pts.current[i];
        let s = 0;
        if (p.visible) {
          const crowded = i !== pk && i !== hv && kept.some((k) => Math.abs(pts.current[k].x - p.x) < gap && Math.abs(pts.current[k].y - p.y) < gap);
          s = crowded ? 0.36 : size / 24;
          if (!crowded) kept.push(i);
        }
        const limb = Math.min(1, Math.max(0, ((p.depth ?? 0) - 0.15) / 0.25));
        pin.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`;
        pin.style.opacity = limb.toFixed(2);
        pin.style.pointerEvents = s > 0.5 && limb > 0.5 ? 'auto' : 'none';
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
        // coast after a fling (0.93 per 60 Hz frame), settling into a slow idle turn
        const target = reduce || refs.current.ticket !== null ? 0 : IDLE;
        s.v = target + (s.v - target) * Math.pow(0.93, dt * 60);
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
      if (visible && refs.current.mode === 'globe') raf = requestAnimationFrame(tick);
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
          world.highlight = refs.current.pick ?? -1;
          world.enableGuide();
          fit();
          frame.scale = base;
          setReady(true);
          kick();
          jetSeam.globe = () => {
            // lift off from (and land back on) the jet's own spot; the touchdown point the first time
            const t = world?.guidePose() ?? world?.guideTouchdown();
            const cv = canvas.current;
            if (!t || !cv) return null;
            const r = cv.getBoundingClientRect();
            return { x: r.left + t.x, y: r.top + t.y, span: t.span, angle: t.angle };
          };
          unseam = jetSeam.subscribe((o) => {
            if (!world) return;
            if (o === 'globe') world.guidePlace();
            else world.guideHide();
            kick();
          });
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
      { rootMargin: '0px 0px -25% 0px' },
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
      unseam?.();
      jetSeam.globe = null;
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
    if (mode === 'globe') globeEl.current?.dispatchEvent(new Event('globe:kick'));
  }, [mode]);

  /* ------------------------- The ticket follows its beacon ------------------------- */
  useEffect(() => {
    if (ticket === null || narrow) return;
    let raf = 0;
    const place = () => {
      raf = requestAnimationFrame(place);
      const stage = stageEl.current;
      const tk = ticketEl.current;
      const line = tether.current;
      const dot = tetherDot.current;
      if (!stage || !tk || !line || !dot) return;
      let x = 0;
      let y = 0;
      let on = true;
      if (refs.current.mode === 'globe') {
        const p = pts.current[ticket];
        x = p.x;
        y = p.y;
        on = p.visible;
      } else {
        const pin = flatPins.current[ticket];
        if (!pin) return;
        const r = pin.getBoundingClientRect();
        const sr = stage.getBoundingClientRect();
        x = r.left + r.width / 2 - sr.left;
        y = r.top + r.height / 2 - sr.top;
        on = x > 0 && x < sr.width;
      }
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const tw = tk.offsetWidth;
      const th = tk.offsetHeight;
      // four quadrants: beside the beacon, a little above or below, always inside the stage
      let right = x < W / 2;
      let tx = right ? x + 56 : x - 56 - tw;
      if (tx < 12 || tx + tw > W - 12) {
        right = !right;
        tx = right ? x + 56 : x - 56 - tw;
      }
      tx = Math.max(12, Math.min(W - tw - 12, tx));
      const ty = Math.max(12, Math.min(H - th - 12, y < H / 2 ? y - th * 0.3 : y - th * 0.7));
      tk.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0)`;
      tk.style.opacity = on ? '1' : '0';
      tk.style.pointerEvents = on ? 'auto' : 'none';
      const ex = right ? tx : tx + tw;
      const ey = Math.max(ty + 28, Math.min(ty + th - 28, y));
      line.setAttribute('x1', x.toFixed(1));
      line.setAttribute('y1', y.toFixed(1));
      line.setAttribute('x2', ex.toFixed(1));
      line.setAttribute('y2', ey.toFixed(1));
      dot.setAttribute('cx', ex.toFixed(1));
      dot.setAttribute('cy', ey.toFixed(1));
      line.style.opacity = on ? '1' : '0';
      dot.style.opacity = on ? '1' : '0';
    };
    raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [ticket, narrow, mode]);

  /* ---------------------- Scroll arrival of the stage ---------------------- */
  useEffect(() => {
    const el = stageEl.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(el, { y: 50 }, { y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 50%', scrub: 0.6 } });
      gsap.fromTo(sweep.current, { v: -1.1 }, { v: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 35%', scrub: 0.8, onUpdate: () => globeEl.current?.dispatchEvent(new Event('globe:kick')) } });
    }, el);
    return () => ctx.revert();
  }, []);

  /* --------------------------- Drag and pinch --------------------------- */
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, .passport-anchor')) return;
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
    // steer the jet toward the cursor while it is over the globe (not on a flag or the ticket)
    const cv = canvas.current;
    if (cv && e.pointerType === 'mouse' && refs.current.mode === 'globe' && refs.current.hover === null && !spin.current.dragging && !(e.target as HTMLElement).closest('.passport-anchor, button, a')) {
      const r = cv.getBoundingClientRect();
      worldRef.current?.guideAim({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) });
    }
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
    if (s.moved > 6 && refs.current.ticket !== null) dismiss();
  };
  const up = (e: React.PointerEvent) => {
    touches.current.delete(e.pointerId);
    if (touches.current.size < 2) pinch.current = null;
    const s = spin.current;
    if (s.dragging && s.moved > 6) {
      track('globe_spun', { where: 'home-explore' });
      setHinted(true);
    } else if (s.dragging && !(e.target as HTMLElement).closest('button, a, .passport-anchor')) dismiss();
    s.dragging = false;
  };
  // Trackpad pinch (ctrl + wheel) zooms; a plain wheel keeps scrolling the page.
  useEffect(() => {
    const el = stageEl.current;
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

  const tc = ticket !== null ? countries[ticket] : null;
  const isLocked = ticket !== null && ticket === locked && hover === null;

  return (
    <div>
      <div className="explore-sky">
      {/* Header row */}
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
                {m === 'globe' ? '3D Globe' : 'Flat World Map'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* The full width observatory stage */}
      <div
        ref={stageEl}
        className="observatory explore-stage-h relative mt-3 overflow-hidden sm:mt-4"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => worldRef.current?.guideAim(null)}
      >
        {/* Globe */}
        <motion.div ref={globeEl} initial={false} animate={{ opacity: mode === 'globe' ? 1 : 0 }} transition={{ duration: 0.45, ease: EASE }} className={`absolute inset-0 touch-none select-none ${mode === 'globe' ? '' : 'hidden'}`}>
          <canvas ref={canvas} aria-hidden className={`absolute inset-0 h-full w-full cursor-grab transition-opacity duration-500 active:cursor-grabbing ${ready ? 'opacity-100' : 'opacity-0'}`} />
          {!ready && !failed && <div aria-hidden className="observatory-placeholder absolute left-1/2 top-1/2 aspect-square w-[min(72%,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-full" />}
          {countries.map((c, i) => (
            <button
              key={c.slug}
              ref={(el) => {
                pins.current[i] = el;
              }}
              type="button"
              tabIndex={-1}
              onClick={() => choose(i, 'home-globe')}
              onPointerEnter={(e) => e.pointerType === 'mouse' && openHover(i)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
              onFocus={() => openHover(i)}
              onBlur={closeSoon}
              className={`explore-pin beacon absolute left-0 top-0 ${pick === i ? 'is-picked' : ''} ${ticket === i ? 'is-hover show-label' : ''}`}
              style={{ transform: 'scale(0)' }}
              aria-label={`${c.name}: open the passport ticket`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagSrc(c.slug)} alt="" width={24} height={24} draggable={false} />
              <span className="explore-pin-label">{c.name}</span>
            </button>
          ))}
        </motion.div>

        {/* Flat map */}
        {mode === 'flat' && (
          <motion.div className="absolute inset-0" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.45, ease: EASE }}>
            <FlatMap countries={countries} pick={pick} ticket={ticket} pinsRef={flatPins} openHover={openHover} closeSoon={closeSoon} choose={choose} zoom={zoom} start={startIndex} />
          </motion.div>
        )}

        {/* The glowing tether from beacon to ticket */}
        {!narrow && tc && (
          <svg className="pointer-events-none absolute inset-0 z-20 h-full w-full" aria-hidden>
            <line ref={tether} className="tether-line" x1="0" y1="0" x2="0" y2="0" />
            <circle ref={tetherDot} className="tether-dot" r="4" cx="0" cy="0" />
          </svg>
        )}

        {/* The passport ticket */}
        <div
          ref={ticketEl}
          className={`passport-anchor z-30 ${narrow ? 'is-sheet' : 'absolute left-0 top-0'}`}
          style={narrow ? undefined : { transform: 'translate3d(-999px, -999px, 0)' }}
          onPointerEnter={keepOpen}
          onPointerLeave={() => hover !== null && closeSoon()}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {tc && <PassportTicket key={tc.slug} c={tc} locked={isLocked || narrow} onClose={dismiss} sheet={narrow} />}
          </AnimatePresence>
        </div>

        <ZoomButtons
          zoom={zoom}
          setZoom={setZoom}
          reset={
            mode === 'globe'
              ? () => {
                  setZoom(1);
                  spin.current.goal = null;
                  spin.current.v = IDLE;
                }
              : undefined
          }
        />
        <p className={`stage-hint pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 ${hinted ? 'is-gone' : ''}`}>
          <span className="stage-hint-dot" aria-hidden />
          <span className="hidden sm:inline">Move your cursor across the globe to fly and hover any flag</span>
          <span className="sm:hidden">Tap any flag to fly there</span>
        </p>
      </div>

      {/* Country discovery slider */}
      </div>

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
              <motion.div className={`slider-card ${pick === i ? 'is-picked' : ''}`} animate={{ scale: pick === i ? 1.05 : 1, y: pick === i ? -4 : 0 }} whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 380, damping: 26 }}>
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
                    stageEl.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
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
      <button type="button" className="zoom-btn" onClick={() => setZoom(zoom * 1.25)} aria-label="Zoom in" disabled={zoom >= ZMAX - 0.01}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </button>
      <button type="button" className="zoom-btn" onClick={() => setZoom(zoom / 1.25)} aria-label="Zoom out" disabled={zoom <= ZMIN + 0.01}>
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

/* --------------------------- The passport ticket --------------------------- */
const ICONS = {
  capital: 'M4 21h16M6 21V10l6-5 6 5v11M10 21v-5h4v5',
  people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a2.5 2.5 0 1 0 0-5M21 20c0-2.6-1.7-4.8-4-5.6',
  area: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  compare: 'M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3',
};
const Icon = ({ d }: { d: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
    <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function PassportTicket({ c, locked, onClose, sheet }: { c: ExploreCountry; locked: boolean; onClose: () => void; sheet: boolean }) {
  const tilt = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = tilt.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 8).toFixed(2)}deg)`;
    el.style.setProperty('--shine-x', `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--shine-y', `${((y + 0.5) * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    if (tilt.current) tilt.current.style.transform = '';
  };
  return (
    <motion.div
      initial={sheet ? { opacity: 0, y: 40 } : { opacity: 0, scale: 0.9, y: 8 }}
      animate={sheet ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
      exit={sheet ? { opacity: 0, y: 30, transition: { duration: 0.16 } } : { opacity: 0, scale: 0.96, transition: { duration: 0.12 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      <div ref={tilt} className="passport" onPointerMove={onMove} onPointerLeave={onLeave}>
        <div className="passport-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pexels(c.photo, 640)} alt={c.photoAlt} decoding="async" />
          <span className="passport-scrim" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagSrc(c.slug)} alt="" width={46} height={46} className="passport-flag" />
          <div className="passport-title">
            <p className="passport-name">{c.name}</p>
            <p className="passport-spot">
              {c.spot}, {c.region}
            </p>
          </div>
          <span className="passport-stamp" aria-label={`Airport ${c.airport}`}>
            <span>{c.airport}</span>
          </span>
          {locked && (
            <button type="button" className="passport-close" onClick={onClose} aria-label="Close the ticket">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <div className="passport-seam" aria-hidden />
        <div className="passport-body">
          <dl className="passport-stats">
            <div className="tint-peach">
              <dt>
                <Icon d={ICONS.capital} /> Capital
              </dt>
              <dd>{c.capital}</dd>
            </div>
            <div className="tint-teal">
              <dt>
                <Icon d={ICONS.people} /> Population
              </dt>
              <dd>{c.population.replace(/^About /, '')}</dd>
            </div>
            <div className="tint-sun">
              <dt>
                <Icon d={ICONS.area} /> Area
              </dt>
              <dd>{c.area}</dd>
            </div>
          </dl>
          <p className="passport-standout">
            <Icon d={ICONS.clock} /> A typical work week is about {c.workHours} hours
          </p>
          <p className="passport-fact">
            <strong>Quick fact</strong> {c.fact}
          </p>
          <div className="passport-foot">
            <Link href={`/countries/${c.slug}`} className="passport-cta" onClick={() => track('explore_country_clicked', { country: c.slug, where: 'home-ticket' })}>
              Explore {c.name}
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/compare" className="passport-compare" aria-label={`Compare ${c.name} with another country`} onClick={() => track('ui_click', { target: 'ticket-compare', country: c.slug })}>
              <Icon d={ICONS.compare} />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------ Flat map ------------------------------ */
function FlatMap({
  countries,
  pick,
  ticket,
  pinsRef,
  openHover,
  closeSoon,
  choose,
  zoom,
  start,
}: {
  countries: ExploreCountry[];
  pick: number | null;
  ticket: number | null;
  pinsRef: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  openHover: (i: number) => void;
  closeSoon: () => void;
  choose: (i: number, where: string) => void;
  zoom: number;
  start: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const planeG = useRef<SVGGElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const dots = useRef<(SVGCircleElement | null)[]>([]);
  const goal = useRef<{ x: number; y: number }>({ x: fx(countries[start]) * 3, y: fy(countries[start]) });
  const at = useRef<{ x: number; y: number }>({ ...goal.current });
  const prevPick = useRef<number | null>(null);
  const [route, setRoute] = useState<{ d: string; key: number } | null>(null);
  const target = ticket ?? pick ?? start;
  // a hovered or picked flag pulls the jet beside it
  useEffect(() => {
    goal.current = { x: fx(countries[target]) * 3 + 2.6, y: fy(countries[target]) - 1.8 };
  }, [target, countries]);
  // a new pick draws the route from the last one
  useEffect(() => {
    const prev = prevPick.current;
    prevPick.current = pick;
    if (pick === null || prev === null || prev === pick) return;
    const x1 = fx(countries[prev]) * 3;
    const y1 = fy(countries[prev]);
    const x2 = fx(countries[pick]) * 3;
    const y2 = fy(countries[pick]);
    const lift = Math.min(28, Math.hypot(x2 - x1, y2 - y1) * 0.35);
    setRoute({ d: `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${Math.min(y1, y2) - lift} ${x2} ${y2}`, key: performance.now() });
  }, [pick, countries]);
  // the flight loop: ease toward the goal, nose along the motion, drop a dot every few frames
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const trail: { x: number; y: number }[] = [];
    let angle = 0;
    let last = performance.now();
    let since = 0;
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const a = at.current;
      const g = goal.current;
      const k = reduce ? 1 : 1 - Math.exp(-dt * 4.5);
      const nx = a.x + (g.x - a.x) * k;
      const ny = a.y + (g.y - a.y) * k;
      const vx = nx - a.x;
      const vy = ny - a.y;
      if (Math.hypot(vx, vy) > 0.02) {
        const want = Math.atan2(vy, vx);
        let d = want - angle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        angle += d * (1 - Math.exp(-dt * 8));
      }
      at.current = { x: nx, y: ny };
      planeG.current?.setAttribute('transform', `translate(${nx.toFixed(2)} ${ny.toFixed(2)}) rotate(${((angle * 180) / Math.PI).toFixed(1)})`);
      since += dt;
      if (since > 0.05 && Math.hypot(vx, vy) > 0.01) {
        since = 0;
        trail.unshift({ x: nx, y: ny });
        if (trail.length > 12) trail.length = 12;
      }
      dots.current.forEach((c, i) => {
        if (!c) return;
        const pt = trail[i];
        if (!pt) return c.setAttribute('opacity', '0');
        c.setAttribute('cx', pt.x.toFixed(2));
        c.setAttribute('cy', pt.y.toFixed(2));
        c.setAttribute('opacity', ((1 - i / 12) * 0.85).toFixed(2));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  /** The cursor, in the map's 300 x 100 space. */
  const followCursor = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || ticket !== null || !svg.current) return;
    const m = svg.current.getScreenCTM();
    if (!m) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    goal.current = { x: Math.max(2, Math.min(298, pt.x)), y: Math.max(2, Math.min(98, pt.y)) };
  };
  const focus = pick ?? 0;
  const ox = pick !== null ? fx(countries[focus]) : 50;
  const oy = pick !== null ? fy(countries[focus]) : 50;
  // Start on the picked country (or the whole map's middle), then keep each new pick in view.
  useEffect(() => {
    const el = box.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const target = pick !== null ? (el.scrollWidth * fx(countries[pick])) / 100 : el.scrollWidth * (215 / 360);
    el.scrollTo({ left: target - el.clientWidth / 2, behavior: 'smooth' });
  }, [pick, countries]);

  return (
    <div ref={box} className="flat-scroll h-full overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
      <div className="flat-frame relative overflow-hidden" onPointerMove={followCursor}>
        <div className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none" style={{ transform: `scale(${zoom})`, transformOrigin: `${ox}% ${oy}%` }}>
          <div className="absolute inset-x-0" style={{ top: `${(-(90 - N) / (N - S)) * 100}%`, height: `${(180 / (N - S)) * 100}%` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/textures/earth-day.webp" alt="" className="flat-img block h-full w-full" draggable={false} />
          </div>
          <svg ref={svg} className="pointer-events-none absolute inset-0 z-[6] h-full w-full" viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden>
            {route && <motion.path key={route.key} d={route.d} fill="none" stroke="#FFB72B" strokeWidth="0.55" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.75, ease: EASE }} />}
            {Array.from({ length: 12 }, (_, i) => (
              <circle
                key={i}
                ref={(c) => {
                  dots.current[i] = c;
                }}
                r={0.45 - i * 0.025}
                fill="#FFB72B"
                opacity="0"
              />
            ))}
            <g ref={planeG}>
              <g transform="scale(0.32) rotate(90) translate(-12 -12)">
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" fill="#fffaf3" stroke="#FF5A6E" strokeWidth="1.2" strokeLinejoin="round" />
              </g>
            </g>
          </svg>
          {countries.map((c, i) => (
            <button
              key={c.slug}
              ref={(el) => {
                pinsRef.current[i] = el;
              }}
              type="button"
              onClick={() => choose(i, 'home-flat')}
              onPointerEnter={(e) => e.pointerType === 'mouse' && openHover(i)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
              onFocus={() => openHover(i)}
              onBlur={closeSoon}
              className={`explore-pin beacon flat absolute ${pick === i ? 'is-picked' : ''} ${ticket === i ? 'is-hover show-label' : ''}`}
              style={{ left: `${fx(c)}%`, top: `${fy(c)}%`, transform: `translate(-50%, -50%) scale(${1 / zoom})` }}
              aria-label={`${c.name}: open the passport ticket`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagSrc(c.slug)} alt="" width={24} height={24} draggable={false} />
              <span className="explore-pin-label">{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
