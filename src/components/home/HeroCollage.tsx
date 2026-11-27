'use client';

/**
 * HERO: a three leg flight across twelve landmarks, then into the globe.
 *
 * The 3D world lives in heroDiorama.ts (plain three.js): twelve landmarks on
 * porcelain discs, four per leg, one in each corner of the view, and a jet
 * that glides its route from country to country. This shell owns the DOM:
 * the words, a flag pill on every disc, the spotlight card, the flight
 * itinerary pill, pointer input and the GSAP ScrollTrigger flight.
 *
 *  - Scrolling pins the hero and flies three legs: Asia and wonders, Europe
 *    and icons, the Americas and Oceania, then hands off to the globe.
 *  - While anything scrolls, hover is locked; it unlocks 260ms after the
 *    scroll stops and only once the pointer deliberately moves.
 *  - Hover (or tap) a landmark or its pill: a ring lights its disc, it lifts,
 *    and a card offers "Fly to Globe".
 *  - Drag tilts the sky a little; it coasts and settles.
 *
 * Native scrolling is never touched: ScrollTrigger only reads the position.
 * Reduced motion: a still panorama of the first leg; hover still works.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { flagSrc } from '@/components/Flag';
import { track } from '@/lib/analytics';
import type { Flight, HeroDiorama, IslandSpec, Landmark } from '@/components/home/heroDiorama';

const ISLANDS: { slug: string; landmark: Landmark; place: string }[] = [
  { slug: 'india', landmark: 'india', place: 'Taj Mahal, Agra' },
  { slug: 'japan', landmark: 'japan', place: 'Mount Fuji, Fujiyoshida' },
  { slug: 'egypt', landmark: 'egypt', place: 'Pyramids of Giza' },
  { slug: 'uae', landmark: 'uae', place: 'Burj Khalifa, Dubai' },
  { slug: 'france', landmark: 'france', place: 'Eiffel Tower, Paris' },
  { slug: 'italy', landmark: 'italy', place: 'Colosseum, Rome' },
  { slug: 'united-kingdom', landmark: 'uk', place: 'Big Ben, London' },
  { slug: 'china', landmark: 'china', place: 'Temple of Heaven, Beijing' },
  { slug: 'usa', landmark: 'usa', place: 'Golden Gate Bridge, San Francisco' },
  { slug: 'brazil', landmark: 'brazil', place: 'Christ the Redeemer, Rio' },
  { slug: 'australia', landmark: 'australia', place: 'Sydney Opera House' },
  { slug: 'singapore', landmark: 'singapore', place: 'Marina Bay Sands' },
];
const INFO = Object.fromEntries(ISLANDS.map((s) => [s.landmark, s]));

/** The flight plan, in scroll progress through the pinned hero. */
const LEGS = [
  { id: 'asia', n: '1', label: 'Asia & Wonders', from: 0, to: 0.32, icon: 'M4 20h16M6 20l6-12 6 12M9 14h6' },
  { id: 'europe', n: '2', label: 'Europe & Icons', from: 0.32, to: 0.66, icon: 'M12 3v4M9 20l3-13 3 13M7 20h10M10 13h4' },
  { id: 'americas', n: '3', label: 'Americas & Oceania', from: 0.66, to: 0.94, icon: 'M12 21V10M12 10c-3 0-6-2-7-5 3 0 6 1 7 5zM12 10c3 0 6-2 7-5-3 0-6 1-7 5zM8 21h8' },
  { id: 'globe', n: '', label: 'Globe · 20 Countries', from: 0.94, to: 1, icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18' },
];

export default function HeroCollage({
  headline,
  tagline,
  names,
  onPick,
}: {
  headline: string;
  tagline: string;
  names: Record<string, string>;
  onPick: (slug: string) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const wash = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const itin = useRef<HTMLDivElement>(null);
  const pills = useRef<(HTMLButtonElement | null)[]>([]);
  const sceneRef = useRef<HeroDiorama | null>(null);
  const placedRef = useRef<IslandSpec[]>([]);
  const stRef = useRef<ScrollTrigger | null>(null);
  const flight = useRef<Flight>({ p: 0 });

  const [placed, setPlaced] = useState<IslandSpec[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  const [kbd, setKbd] = useState(false);
  const [touched, setTouched] = useState(false);

  // "Same planet. Different lives." The second sentence gets the sunlit gold.
  const [lead, glow] = useMemo(() => {
    const at = headline.indexOf('. ');
    return at > 0 ? [headline.slice(0, at + 1), headline.slice(at + 2)] : [headline, ''];
  }, [headline]);

  const pick = useCallback(
    (i: number) => {
      const s = placedRef.current[i];
      if (s) onPick(s.slug);
    },
    [onPick],
  );

  /* --------------------------- The 3D world --------------------------- */
  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const phone = window.innerWidth < 768;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const specs: IslandSpec[] = ISLANDS.map((s) => ({ key: s.landmark, slug: s.slug, landmark: s.landmark, name: names[s.slug] ?? s.slug }));

    let scene: HeroDiorama | null = null;
    let disposed = false;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;

    import('@/components/home/heroDiorama')
      .then((mod) => {
        if (disposed) return;
        try {
          scene = new mod.HeroDiorama(cv, specs, { phone, reduce, flight: flight.current });
        } catch {
          return; // no WebGL: the CSS sky and the words still stand on their own
        }
        sceneRef.current = scene;
        placedRef.current = scene.placed;
        setPlaced(scene.placed);
        scene.onFocus = (i) => setFocus(i);
        scene.setCard(card.current);
        scene.resize(el.clientWidth, el.clientHeight);
        el.dataset.ready = 'true';
        ro = new ResizeObserver(() => scene?.resize(el.clientWidth, el.clientHeight));
        ro.observe(el);
        // Draw only while the hero (or its pinned flight) is on screen.
        io = new IntersectionObserver(([e]) => (e.isIntersecting ? scene?.start() : scene?.stop()));
        io.observe(el);
      })
      .catch(() => {});

    return () => {
      disposed = true;
      io?.disconnect();
      ro?.disconnect();
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [names]);

  useEffect(() => {
    sceneRef.current?.setPills(pills.current);
  }, [placed]);

  /* ---------------------- Scroll locks hover, briefly ---------------------- */
  useEffect(() => {
    const lock = () => sceneRef.current?.lockHover();
    window.addEventListener('scroll', lock, { passive: true });
    window.addEventListener('wheel', lock, { passive: true });
    return () => {
      window.removeEventListener('scroll', lock);
      window.removeEventListener('wheel', lock);
    };
  }, []);

  /* ------------------------------ Pointer ------------------------------ */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const onUi = (e: Event) => !!(e.target as Element | null)?.closest?.('.sky-pill, .spot-anchor, .itinerary');
    const move = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s) return;
      const [x, y] = local(e);
      s.pointerMove(x, y, e.pointerType);
      if (s.dragDistance > 10) setTouched(true);
    };
    const down = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s || onUi(e) || e.button > 0) return;
      setKbd(false);
      const [x, y] = local(e);
      s.pointerMove(x, y, e.pointerType);
      s.pointerDown(x, y);
    };
    const up = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s) return;
      const { tap, hit } = s.pointerUp(e.type === 'pointercancel');
      if (!tap || onUi(e)) return;
      setTouched(true);
      if (e.pointerType === 'mouse') {
        if (hit !== null) pick(hit);
      } else if (hit === null) s.setFocus(null);
      else if (hit === s.focus) pick(hit);
      else s.setFocus(hit);
    };
    const leave = () => sceneRef.current?.pointerLeave();
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      el.removeEventListener('pointerleave', leave);
    };
  }, [pick]);

  /* ------------------------ Scroll: the three legs ------------------------ */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    // The header is sticky, so the hero starts right under it.
    const header = () => {
      const cs = getComputedStyle(document.documentElement);
      return parseFloat(cs.getPropertyValue('--header')) * parseFloat(cs.fontSize) || 0;
    };
    const fill = (p: number) => {
      const bar = itin.current;
      if (!bar) return;
      LEGS.forEach((l) => bar.style.setProperty(`--${l.id}`, Math.min(1, Math.max(0, (p - l.from) / (l.to - l.from))).toFixed(3)));
      const found = LEGS.findIndex((l) => p < l.to);
      const now = found < 0 ? 3 : found;
      if (bar.dataset.leg !== String(now)) bar.dataset.leg = String(now);
    };
    fill(0);
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      const build = (desktop: boolean) => {
        const f = flight.current;
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el,
            start: () => `top top+=${header()}`,
            end: desktop ? '+=240%' : '+=150%',
            scrub: 0.55,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (st) => fill(st.progress),
          },
        });
        stRef.current = tl.scrollTrigger ?? null;
        tl.to(f, { p: 1, duration: 1 }, 0)
          .to(copy.current, { yPercent: -16, scale: 1.06, opacity: 0, duration: 0.18, ease: 'power2.in' }, 0)
          .to(hint.current, { opacity: 0, duration: 0.05 }, 0)
          .to(wash.current, { opacity: 1, duration: 0.03, ease: 'power1.in' }, 0.97);
        return () => {
          f.p = 0;
          stRef.current = null;
        };
      };
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => build(true));
      mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => build(false));
    }, el);
    return () => ctx.revert();
  }, []);

  const jump = (i: number) => {
    const leg = LEGS[i];
    track('hero_leg_jump', { leg: leg.id });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const st = stRef.current;
    if (leg.id === 'globe' || !st) {
      document.getElementById('explore')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    // land a little into the leg, when its four landmarks are in place
    const at = leg.from === 0 ? 0 : leg.from + 0.03;
    window.scrollTo({ top: st.start + (st.end - st.start) * at, behavior: reduce ? 'auto' : 'smooth' });
  };

  const focused = focus !== null ? placed[focus] : null;
  const info = focused ? INFO[focused.landmark] : null;

  return (
    <section ref={root} className="hero-diorama relative isolate overflow-hidden" aria-labelledby="hero-title">
      <canvas ref={canvas} aria-hidden className="diorama-canvas absolute inset-0 h-full w-full" />

      {/* The words, in the open corridor between the four landmarks */}
      <div ref={copy} className="diorama-copy pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-5 text-center">
        <h1 id="hero-title" className="diorama-title">
          <span className="block">{lead}</span>
          {glow && <span className="diorama-gold block">{glow}</span>}
        </h1>
        <p className="diorama-tagline mx-auto">{tagline}</p>
      </div>

      {/* A flag pill on the front rim of every disc; the scene places them */}
      {placed.map((s, i) => (
        <button
          key={s.key}
          ref={(n) => {
            pills.current[i] = n;
          }}
          type="button"
          tabIndex={-1}
          aria-hidden
          className="sky-pill absolute left-0 top-0 z-20"
          style={{ opacity: 0, transform: 'translate3d(-999px, -999px, 0)' }}
          onPointerEnter={(e) => {
            const sc = sceneRef.current;
            if (!sc || (e.pointerType === 'mouse' && !sc.canHover)) return;
            sc.holdFocus = true;
            sc.setFocus(i);
          }}
          onPointerLeave={() => {
            if (sceneRef.current) sceneRef.current.holdFocus = false;
          }}
          onClick={() => {
            const sc = sceneRef.current;
            if (sc && sc.focus !== i) sc.setFocus(i);
            else pick(i);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flagSrc(s.slug)} alt="" width={22} height={22} />
          {s.name}
        </button>
      ))}

      {/* The spotlight card beside the focused landmark */}
      <div
        ref={card}
        className="spot-anchor absolute left-0 top-0 z-30"
        style={{ transform: 'translate3d(-999px, -999px, 0)', pointerEvents: focused ? 'auto' : 'none' }}
        onPointerEnter={() => {
          if (sceneRef.current) sceneRef.current.holdFocus = true;
        }}
        onPointerLeave={() => {
          if (sceneRef.current) sceneRef.current.holdFocus = false;
        }}
      >
        <AnimatePresence initial={false}>
          {focused && info && (
            <motion.div
              key={focused.key}
              className={`spot-card ${kbd ? 'is-kbd' : ''}`}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } }}
              transition={{ type: 'spring', stiffness: 460, damping: 34 }}
            >
              <div className="spot-head">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagSrc(focused.slug)} alt="" width={40} height={40} />
                <div className="min-w-0">
                  <p className="spot-name">{focused.name}</p>
                  <p className="spot-place">{info.place}</p>
                </div>
              </div>
              <button type="button" className="spot-fly" onClick={() => focus !== null && pick(focus)} tabIndex={-1}>
                Fly to Globe
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard and screen reader route to every landmark */}
      <ul className="sr-only">
        {placed.map((s, i) => (
          <li key={s.key}>
            <button
              type="button"
              onFocus={() => {
                setKbd(true);
                sceneRef.current?.setFocus(i);
              }}
              onBlur={() => sceneRef.current?.setFocus(null)}
              onClick={() => pick(i)}
            >
              Fly to {s.name} on the globe
            </button>
          </li>
        ))}
      </ul>

      {/* GSAP fades the wrapper on scroll; the pill itself fades after the first touch. */}
      <div ref={hint} aria-hidden className="diorama-hint-wrap pointer-events-none absolute inset-x-0 z-20 flex justify-center">
        <p className={`diorama-hint ${touched || focused ? 'is-gone' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M8 9l-4 3 4 3M16 9l4 3-4 3M4 12h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Drag to tilt the sky
        </p>
      </div>

      {/* The flight itinerary: where the scroll takes you, and a way to jump there */}
      <nav ref={itin} data-leg="0" className="itinerary absolute bottom-4 left-1/2 z-30 -translate-x-1/2" aria-label="Flight legs">
        {LEGS.map((l, i) => (
          <button key={l.id} type="button" className="itinerary-leg" data-i={i} onClick={() => jump(i)} style={{ '--fill': `var(--${l.id}, 0)` } as React.CSSProperties}>
            <span className="itinerary-fill" aria-hidden />
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path d={l.icon} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {l.n && <span className="itinerary-n">{l.n}</span>}
            <span className="itinerary-label">{l.label}</span>
          </button>
        ))}
      </nav>
      <div ref={wash} aria-hidden className="diorama-wash pointer-events-none absolute inset-0 z-40" />
    </section>
  );
}
