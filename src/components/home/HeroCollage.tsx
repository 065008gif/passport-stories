'use client';

/**
 * HERO: an expressive 3D world diorama and a scroll driven flight.
 *
 * The 3D world lives in heroDiorama.ts (plain three.js): five sculpted
 * floating islands, balloons, clouds and a hero scale plane. This shell owns
 * the DOM: the words, the destination pill over a focused island, the drag
 * hint, pointer input and the GSAP ScrollTrigger flight.
 *
 *  - Drag anywhere to tilt and turn the world; it coasts and settles.
 *  - Hover (or tap on a phone) an island: it lifts and a pill offers
 *    "Explore Japan". The pill, a click, or a second tap scrolls to the
 *    globe with that country picked (see HomeAtlas).
 *  - Scrolling pins the hero on laptops: the camera pushes into the sky,
 *    the plane sweeps past the lens along a curve, the islands part, and
 *    the sky melts into the atlas. Scrolling back reverses it.
 *
 * Native scrolling is never touched: ScrollTrigger only reads the position.
 * Reduced motion: a still diorama, hover and the pill still work.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { flagSrc } from '@/components/Flag';
import type { Flight, HeroDiorama, IslandKind, IslandSpec } from '@/components/home/heroDiorama';

const ISLANDS: { key: string; slug: string; kind: IslandKind }[] = [
  { key: 'japan', slug: 'japan', kind: 'asia' },
  { key: 'france', slug: 'france', kind: 'europe' },
  { key: 'india', slug: 'india', kind: 'india' },
  { key: 'egypt', slug: 'egypt', kind: 'desert' },
  { key: 'sweden', slug: 'sweden', kind: 'nordic' },
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
  const pill = useRef<HTMLDivElement>(null);
  const wash = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HeroDiorama | null>(null);
  const specsRef = useRef<IslandSpec[]>([]);
  const flight = useRef<Flight>({ push: 0, fly: 0, dive: 0 });

  const [specs, setSpecs] = useState<IslandSpec[]>([]);
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
      const s = specsRef.current[i];
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
    const list: IslandSpec[] = ISLANDS.slice(0, phone ? 4 : 5).map((s) => ({ ...s, label: `Explore ${names[s.slug] ?? s.slug}` }));
    specsRef.current = list;
    setSpecs(list);

    let scene: HeroDiorama | null = null;
    let disposed = false;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;

    import('@/components/home/heroDiorama')
      .then((mod) => {
        if (disposed) return;
        try {
          scene = new mod.HeroDiorama(cv, list, { phone, reduce, flight: flight.current });
        } catch {
          return; // no WebGL: the CSS sky and the words still stand on their own
        }
        sceneRef.current = scene;
        scene.onFocus = (i) => setFocus(i);
        scene.setPill(pill.current);
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

  /* ------------------------------ Pointer ------------------------------ */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const onPill = (e: Event) => !!(e.target as Element | null)?.closest?.('.diorama-pill-anchor');
    const move = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s || onPill(e)) return;
      const [x, y] = local(e);
      s.pointerMove(x, y, e.pointerType);
      if (s.dragDistance > 10) setTouched(true);
    };
    const down = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s || onPill(e) || e.button > 0) return;
      setKbd(false);
      const [x, y] = local(e);
      s.pointerMove(x, y, e.pointerType);
      s.pointerDown(x, y);
    };
    const up = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s) return;
      const { tap, hit } = s.pointerUp(e.type === 'pointercancel');
      if (!tap || onPill(e)) return;
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

  /* ------------------------ Scroll: the flight ------------------------ */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);
    // The header is sticky, so the hero starts right under it.
    const header = () => {
      const cs = getComputedStyle(document.documentElement);
      return parseFloat(cs.getPropertyValue('--header')) * parseFloat(cs.fontSize) || 0;
    };
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      const build = (desktop: boolean) => {
        const f = flight.current;
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: el,
            start: () => `top top+=${header()}`,
            end: desktop ? '+=140%' : '+=90%',
            scrub: 0.7,
            pin: desktop,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        tl.to(copy.current, { yPercent: -16, scale: 1.08, opacity: 0, duration: 0.25, ease: 'power2.in' }, 0)
          .to([hint.current, cue.current], { opacity: 0, duration: 0.08 }, 0)
          .to(f, { push: 1, duration: 0.85, ease: 'power1.inOut' }, 0)
          .to(f, { fly: 1, duration: 0.7, ease: 'sine.inOut' }, 0.15)
          .to(f, { dive: 1, duration: 0.25, ease: 'power2.in' }, 0.75)
          .to(wash.current, { opacity: 1, duration: 0.22, ease: 'power1.in' }, 0.78);
        return () => {
          f.push = 0;
          f.fly = 0;
          f.dive = 0;
        };
      };
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => build(true));
      mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => build(false));
    }, el);
    return () => ctx.revert();
  }, []);

  const focused = focus !== null ? specs[focus] : null;

  return (
    <section ref={root} className="hero-diorama relative isolate overflow-hidden" aria-labelledby="hero-title">
      <canvas ref={canvas} aria-hidden className="diorama-canvas absolute inset-0 h-full w-full" />

      {/* The words, in the open sunlit corridor */}
      <div ref={copy} className="diorama-copy pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-5 text-center">
        <h1 id="hero-title" className="diorama-title">
          <span className="block">{lead}</span>
          {glow && <span className="diorama-gold block">{glow}</span>}
        </h1>
        <p className="diorama-tagline mx-auto">{tagline}</p>
      </div>

      {/* Destination pill, pinned above the focused island by the scene */}
      <div
        ref={pill}
        className="diorama-pill-anchor absolute left-0 top-0 z-30"
        style={{ transform: 'translate3d(-999px, -999px, 0)', pointerEvents: focused ? 'auto' : 'none' }}
        onPointerEnter={() => {
          if (sceneRef.current) sceneRef.current.holdFocus = true;
        }}
        onPointerLeave={() => {
          if (sceneRef.current) sceneRef.current.holdFocus = false;
        }}
      >
        <AnimatePresence initial={false}>
          {focused && (
            <motion.button
              key={focused.key}
              type="button"
              tabIndex={-1}
              className={`diorama-pill ${kbd ? 'is-kbd' : ''}`}
              onClick={() => focus !== null && pick(focus)}
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } }}
              transition={{ type: 'spring', duration: 0.38, bounce: 0.25 }}
              whileTap={{ scale: 0.96 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagSrc(focused.slug)} alt="" width={24} height={24} />
              <span>{focused.label}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard and screen reader route to every island */}
      <ul className="sr-only">
        {specs.map((s, i) => (
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
              {s.label} on the globe
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
          Drag to tilt the world
        </p>
      </div>
      <div ref={cue} aria-hidden className="diorama-cue pointer-events-none absolute bottom-5 left-1/2 z-20">
        <span className="diorama-cue-dot" />
      </div>
      <div aria-hidden className="diorama-foot pointer-events-none absolute inset-x-0 bottom-0 z-[5]" />
      <div ref={wash} aria-hidden className="diorama-wash pointer-events-none absolute inset-0 z-40" />
    </section>
  );
}
