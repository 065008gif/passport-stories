'use client';

/**
 * FlightHome: runs the home page.
 *
 * The page content (hero, one screen per stop, the "your turn" screen) is
 * ordinary server-rendered HTML passed in as `children`. This component
 * pins the 3D scene behind it and connects it to the scroll position:
 *
 *   scroll position / screen height = progress along the route
 *
 * One wheel notch, arrow key or swipe moves exactly one screen, and the
 * plane's position is read straight from the scroll, so nothing lags.
 *
 * On the last screen the globe moves to the centre and is handed over:
 * it turns slowly by itself, spins with the visitor's drag (and keeps
 * some momentum), and every country appears as a flag that can be tapped.
 */
import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { earnBadge } from '@/lib/passport';
import { flagSrc } from '../Flag';
import { useBoard } from '../FlightProvider';
import type { FlightWorld, Frame } from './world';

export interface HomeCountry {
  slug: string;
  name: string;
  airport: string;
  tagline: string;
  lat: number;
  lng: number;
}

const DEG = Math.PI / 180;
const IDLE_SPIN = 0.12; // radians per second when nobody is touching the globe
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function FlightHome({
  countries,
  route,
  children,
}: {
  countries: HomeCountry[];
  /** Indexes into `countries`: where the flight starts, then each stop. */
  route: number[];
  children: React.ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const grab = useRef<HTMLDivElement>(null);
  const pins = useRef<(HTMLButtonElement | null)[]>([]);
  const tracker = useRef<HTMLSpanElement>(null);
  // Spin state lives in a ref: it changes every frame and must not re-render React.
  const hero = useRef({ on: false, spin: 0, tilt: 0, velocity: IDLE_SPIN }); // the take-off screen globe
  const spin = useRef({ x: 0, y: 0, velocity: IDLE_SPIN, dragging: false, hover: false, lastX: 0, lastY: 0, lastT: 0, auto: null as null | { from: number; to: number; fromY: number; toY: number; start: number; done: () => void } });
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // Flat map instead of the globe (last screen only). The ref lets the frame loop read it.
  const [flat, setFlat] = useState(false);
  const flatRef = useRef(false);
  flatRef.current = flat;
  // The Globe / Flat map buttons live in the page text (MapToggle) and talk to us by event.
  useEffect(() => {
    const on = (e: Event) => setFlat(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener('ps:flat', on);
    return () => window.removeEventListener('ps:flat', on);
  }, []);
  const board = useBoard();

  /** Height of one flight screen in pixels (they are all 100svh tall). */
  // Where the flight starts, measured from just under the sticky header.
  const flightTop = () => (root.current ? root.current.offsetTop - (document.querySelector('header')?.offsetHeight || 0) : 0);
  const screenH = () => root.current?.querySelector<HTMLElement>('.flight-screen')?.offsetHeight || window.innerHeight;

  const legs = route.length - 1; // hops in the flight
  const screens = legs + 2; // hero + one per stop + "your turn"
  const lastStop = countries[route[legs]];

  useEffect(() => {
    // Swipe-snapping is only for the home page, and only while it is the page on screen.
    if (window.location.pathname === '/') document.documentElement.classList.add('snap-page');
    return () => document.documentElement.classList.remove('snap-page');
  }, []);

  /* ------------- Mouse wheel and keys: one notch = one hop ---------------- */
  // Touch screens get this from CSS scroll-snap. A mouse wheel moves in small
  // steps that snapping would bounce back, so one wheel gesture (or arrow /
  // page key) moves exactly one screen. Past the last screen the page scrolls
  // normally again.
  useEffect(() => {
    let locked = 0;
    const position = () => (root.current ? Math.max(0, (window.scrollY - flightTop()) / screenH()) : 0);
    const hop = (dir: number) => {
      const here = position();
      const target = dir > 0 ? Math.floor(here + 0.02) + 1 : Math.ceil(here - 0.02) - 1;
      if (target < 0 || target > screens - 1) return;
      locked = performance.now() + 620;
      window.scrollTo({ top: flightTop() + target * screenH(), behavior: 'smooth' });
    };
    const inFlight = (dir: number) => {
      const here = position();
      return dir > 0 ? here < screens - 1.02 : here > 0.02 && here <= screens - 0.98 && window.scrollY > flightTop();
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      const dir = Math.sign(e.deltaY);
      if (!dir || !inFlight(dir)) return;
      e.preventDefault();
      if (performance.now() > locked && Math.abs(e.deltaY) > 4) hop(dir);
    };
    const onKey = (e: KeyboardEvent) => {
      if (/input|textarea|select|button/i.test((e.target as HTMLElement)?.tagName || '') && e.key === ' ') return;
      if (/input|textarea|select/i.test((e.target as HTMLElement)?.tagName || '')) return;
      const dir = ['ArrowDown', 'PageDown', ' '].includes(e.key) ? 1 : ['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 0;
      if (!dir || !inFlight(dir)) return;
      e.preventDefault();
      if (performance.now() > locked) hop(dir);
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [screens]);

  /* ------------------------------ Frame loop ------------------------------ */
  useEffect(() => {
    let world: FlightWorld | null = null;
    let disposed = false;
    let raf = 0;
    let w = 0;
    let h = 0;
    let smooth = -1;
    let lastStep = -1;
    let landed = false;
    let previous = performance.now();
    const disc = { x: 0, y: 0, r: 0 };
    const point = { x: 0, y: 0, visible: false };
    const start = performance.now();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frame: Frame = { progress: 0, free: 0, x: 0, y: 0, scale: 1, dragX: 0, dragY: 0, time: 0 };
    const screenEls = Array.from(root.current!.querySelectorAll<HTMLElement>('.flight-screen'));

    const measure = () => {
      w = stage.current!.clientWidth;
      h = stage.current!.clientHeight;
      world?.resize(w, h, Math.min(window.devicePixelRatio || 1, w < 768 ? 2 : 1.75));
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      if (document.hidden || !h || !root.current) return; // (the page may be mid-navigation)
      const top = flightTop();
      const page = screenH();
      const raw = clamp((window.scrollY - top) / page, 0, screens - 1);

      // Which screen are we on? Its text pops in; the tracker updates.
      const current = Math.round(raw);
      if (current !== lastStep) {
        lastStep = current;
        setStep(current);
        screenEls.forEach((el, i) => el.classList.toggle('is-here', i === current));
        if (current === screens - 1 && !landed) {
          landed = true; // flew the whole route
          window.setTimeout(() => earnBadge('tour-guide'), 2600); // let the spin screen land first
          track('flight_completed');
        }
      }
      // The little plane on the tracker follows the scroll exactly.
      if (tracker.current) tracker.current.style.left = `${(Math.min(raw, screens - 1) / (screens - 1)) * 100}%`;
      if (!world || window.scrollY - top > page * (screens + 0.2)) return; // nothing to draw

      smooth = smooth < 0 || reduce ? raw : smooth + (raw - smooth) * 0.28;
      const free = clamp(smooth - legs);

      // Free roam: the globe drifts, follows a drag, and keeps some momentum.
      const s = spin.current;
      if (s.auto) {
        // "Surprise me": a fast, eased spin to the chosen country
        const t = clamp((now - s.auto.start) / 1300);
        const ease = 1 - Math.pow(1 - t, 3);
        s.x = lerp(s.auto.from, s.auto.to, ease);
        s.y = lerp(s.auto.fromY, s.auto.toY, ease);
        if (t >= 1) {
          const done = s.auto.done;
          s.auto = null;
          s.velocity = 0;
          done();
        }
      } else if (!s.dragging && free > 0.5) {
        const target = s.hover || reduce ? 0 : IDLE_SPIN;
        s.velocity += (target - s.velocity) * Math.min(1, dt * 1.6);
        s.x += s.velocity * dt;
      }

      // Where the globe sits. Flying: right of the text (above it on phones).
      // Free roam: dead centre and bigger.
      const mobile = w < 768;
      const viewH = world.viewHeight;
      const viewW = viewH * (w / h);
      const fly = mobile ? { x: 0, y: viewH * 0.28, scale: Math.min(viewW * 0.36, viewH * 0.17) } : { x: viewW * 0.2, y: 0, scale: Math.min(viewH * 0.36, viewW * 0.24) };
      const short = h < 800; // short laptop screens: smaller globe so it sits between the title and the buttons
      const roam = mobile ? { x: 0, y: viewH * 0.02, scale: Math.min(viewW * 0.46, viewH * 0.25) } : { x: 0, y: -viewH * (short ? 0.02 : 0.02), scale: Math.min(viewH * (short ? 0.215 : 0.3), viewW * 0.3) };
      frame.progress = Math.min(smooth, legs);
      frame.free = free;
      frame.x = lerp(fly.x, roam.x, free);
      frame.y = lerp(fly.y, roam.y, free);
      frame.scale = lerp(fly.scale, roam.scale, free);
      // The globe never sits still: it turns slowly before take-off and sways
      // gently around each stop, like on the spin screen.
      // On the take-off screen it can also be grabbed and spun by hand; when
      // let go it keeps its momentum, then eases back into the slow turn.
      const hs = hero.current;
      hs.on = raw < 0.35;
      if (!reduce) {
        if (raw < 0.5) {
          if (!s.dragging) {
            hs.velocity += (IDLE_SPIN - hs.velocity) * Math.min(1, dt * 1.4);
            hs.spin += hs.velocity * dt;
            hs.tilt += (0 - hs.tilt) * Math.min(1, dt * 2.5);
          }
        } else {
          const rest = Math.round(hs.spin / (Math.PI * 2)) * Math.PI * 2;
          hs.spin += (rest - hs.spin) * Math.min(1, dt * 6);
          hs.tilt += (0 - hs.tilt) * Math.min(1, dt * 6);
        }
      }
      const heroSpin = hs.spin;
      const sway = reduce ? 0 : Math.sin(((now - start) / 1000) * 0.45) * 0.2 * (1 - free) * clamp(raw * 2);
      frame.dragX = s.x * free + heroSpin + sway;
      frame.dragY = s.y * free + hs.tilt * (1 - free);
      frame.time = (now - start) / 1000;
      world.render(frame);

      // The drag handle sits exactly over the globe, and only on the last
      // screen, so the rest of the page keeps scrolling normally.
      world.disc(disc);
      const g = grab.current!;
      g.style.width = g.style.height = `${disc.r * 2}px`;
      g.style.transform = `translate(${disc.x - disc.r}px, ${disc.y - disc.r}px)`;
      g.style.pointerEvents = (free > 0.9 && !flatRef.current) || (hs.on && !flatRef.current) ? 'auto' : 'none';
      g.style.touchAction = hs.on ? 'pan-y' : 'none'; // phones can still scroll past the hero globe

      // Flag pins: one per country, glued to its spot on the globe.
      const show = free > 0.6;
      pins.current.forEach((pin, i) => {
        if (!pin) return;
        world!.project(i, point);
        const on = show && point.visible;
        pin.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) scale(${on ? 1 : 0})`;
        pin.style.pointerEvents = on && free > 0.9 ? 'auto' : 'none';
      });
    };

    measure();
    window.addEventListener('resize', measure);
    import('./world')
      .then((mod) => {
        if (disposed) return;
        world = new mod.FlightWorld(
          canvas.current!,
          countries.map((c) => ({ lat: c.lat, lng: c.lng })),
          route,
          { day: '/textures/earth-day.jpg', night: '/textures/earth-night.jpg' },
        );
        measure();
        setReady(true);
      })
      .catch(() => setFailed(true));
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      world?.dispose();
    };
  }, [countries, route, legs, screens]);

  /* --------------- "Surprise me": spin to a random country --------------- */
  useEffect(() => {
    const onTeleport = (e: Event) => {
      const detail = (e as CustomEvent<{ slug: string; handled: boolean }>).detail;
      const target = countries.find((c) => c.slug === detail.slug);
      const onLastScreen = (window.scrollY - flightTop()) / screenH() > screens - 1.5;
      if (!target || !onLastScreen) return;
      detail.handled = true;
      const s = spin.current;
      // Rotation needed to bring the target to the front, plus one full extra turn for drama.
      let to = (lastStop.lng - target.lng) * DEG;
      while (to < s.x + Math.PI) to += Math.PI * 2;
      s.auto = {
        from: s.x,
        to,
        fromY: s.y,
        toY: (target.lat - lastStop.lat) * DEG * 0.75,
        start: performance.now(),
        done: () => board(`/countries/${target.slug}`, { name: target.name, code: target.airport }),
      };
    };
    window.addEventListener('ps:teleport', onTeleport);
    return () => window.removeEventListener('ps:teleport', onTeleport);
  }, [countries, lastStop, screens, board]);

  /* ----------------------- Drag to spin, with momentum ---------------------- */
  const onDown = (e: React.PointerEvent) => {
    const s = spin.current;
    if (s.auto) return;
    s.dragging = true;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.lastT = performance.now();
    if (hero.current.on) hero.current.velocity = 0;
    else s.velocity = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
  };
  const onMove = (e: React.PointerEvent) => {
    const s = spin.current;
    if (!s.dragging) return;
    const now = performance.now();
    const dx = (e.clientX - s.lastX) * 0.0065;
    const hs = hero.current;
    if (hs.on) {
      // Take-off screen: spin the hero globe.
      const dt = Math.max(0.008, (now - s.lastT) / 1000);
      hs.spin += dx;
      hs.tilt = clamp(hs.tilt + (e.clientY - s.lastY) * 0.0065, -0.7, 0.7);
      hs.velocity = lerp(hs.velocity, clamp(dx / dt, -9, 9), 0.5);
      s.lastX = e.clientX;
      s.lastY = e.clientY;
      s.lastT = now;
      return;
    }
    s.x += dx;
    s.y = clamp(s.y + (e.clientY - s.lastY) * 0.0065, -0.9, 0.9);
    // Remember how fast the globe was moving so it keeps going on release.
    const dt = Math.max(0.008, (now - s.lastT) / 1000);
    s.velocity = lerp(s.velocity, clamp(dx / dt, -9, 9), 0.5);
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.lastT = now;
  };
  const onUp = (e: React.PointerEvent) => {
    if (spin.current.dragging) track('globe_spun', { where: hero.current.on ? 'hero' : 'free_roam' });
    spin.current.dragging = false;
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
  };

  const jump = (i: number) => window.scrollTo({ top: flightTop() + i * screenH(), behavior: 'smooth' });
  const stops = route.map((i) => countries[i]);
  const free = step === screens - 1;

  return (
    <div ref={root} className="relative" data-flight-root>
      {/* The 3D stage, pinned behind the content for the length of the flight */}
      <div ref={stage} className="pointer-events-none sticky top-[var(--header)] z-0 -mb-[calc(100svh-var(--header))] h-[calc(100svh-var(--header))] overflow-hidden">
        <div className="space absolute inset-0" />
        <canvas ref={canvas} aria-hidden className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${ready && !(flat && free) ? 'opacity-100' : 'opacity-0'}`} />
        {failed && <div aria-hidden className="planet-fallback absolute right-[8%] top-1/2 hidden h-[60vmin] w-[60vmin] -translate-y-1/2 rounded-full md:block" />}

        {/* Drag handle over the globe (last screen only) */}
        <div ref={grab} aria-hidden className="absolute left-0 top-0 rounded-full" style={{ touchAction: 'none', cursor: 'grab', pointerEvents: 'none' }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} />

        {/* A flag pinned to every country. Real buttons: tap one to fly there. */}
        <ul aria-label="Countries on the globe" className={free && !flat ? '' : 'invisible'}>
          {countries.map((c, i) => (
            <li key={c.slug}>
              <button
                ref={(el) => {
                  pins.current[i] = el;
                }}
                onClick={() => board(`/countries/${c.slug}`, { name: c.name, code: c.airport })}
                onPointerEnter={() => (spin.current.hover = true)}
                onPointerLeave={() => (spin.current.hover = false)}
                onFocus={() => (spin.current.hover = true)}
                onBlur={() => (spin.current.hover = false)}
                className="globe-pin group absolute left-0 top-0"
                style={{ transform: 'scale(0)' }}
                tabIndex={free ? 0 : -1}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagSrc(c.slug)} alt="" width={30} height={30} draggable={false} />
                <span className="globe-pin-label">{c.name}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Flat map: the same Earth unrolled, with the same flag pins */}
        {free && flat && (
          <div className="pointer-events-auto absolute inset-x-0 top-1/2 z-[5] mx-auto w-[min(94vw,980px)] -translate-y-[46%] px-2">
            <div className="flat-map relative overflow-hidden rounded-3xl border-2 border-cream/25 shadow-ticket">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/textures/earth-day.jpg" alt="" className="block aspect-[2/1] w-full object-cover" draggable={false} />
              <ul aria-label="Countries on the map">
                {countries.map((c) => (
                  <li key={c.slug}>
                    <button onClick={() => board(`/countries/${c.slug}`, { name: c.name, code: c.airport })} className="globe-pin flat-pin group absolute" style={{ left: `${((c.lng + 180) / 360) * 100}%`, top: `${((90 - c.lat) / 180) * 100}%` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={flagSrc(c.slug)} alt="" width={26} height={26} draggable={false} />
                      <span className="globe-pin-label">{c.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Flight tracker: where you are on the route, and a way to jump */}
        <nav aria-label="Flight route" className="pointer-events-auto absolute inset-x-0 bottom-3 z-10 flex justify-center px-2 sm:bottom-5 lg:justify-end lg:pr-[4vw]">
          <div className="tracker">
            <div className="tracker-line">
              <span className="tracker-fill" style={{ width: `${(step / (screens - 1)) * 100}%` }} />
              <span ref={tracker} className="tracker-plane" aria-hidden>
                ✈
              </span>
            </div>
            <ol className="relative flex justify-between">
              {[...stops, null].map((c, i) => (
                <li key={c ? c.slug : 'all'}>
                  <button onClick={() => jump(i)} aria-current={i === step ? 'step' : undefined} aria-label={c ? (i === 0 ? `Start: ${c.name}` : `Stop ${i}: ${c.name}`) : 'All 20 countries: spin the globe'} className={`tracker-stop ${i === step ? 'is-active' : i < step ? 'is-done' : ''}`}>
                    {c ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={flagSrc(c.slug)} alt="" width={30} height={30} />
                    ) : (
                      <span className="tracker-globe" aria-hidden>
                        20
                      </span>
                    )}
                    <span className="tracker-code">{c ? c.airport : 'ALL'}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </nav>
      </div>

      <div className="pointer-events-none relative z-10 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">{children}</div>
    </div>
  );
}
