'use client';

/**
 * HERO: the sunlit 3D sky world and a three act scroll flight.
 *
 * The 3D world lives in heroDiorama.ts (plain three.js): twelve landmark
 * islands in three waves, clouds, balloons and a hero scale jet. This shell
 * owns the DOM: the words, a flag pill under every island, the spotlight
 * card for a focused island, the drag hint, the act dots, pointer input and
 * the GSAP ScrollTrigger flight.
 *
 *  - Drag anywhere to tilt and turn the sky; it coasts and settles. The
 *    pointer leaves a sparkle wake and nudges clouds and balloons.
 *  - Hover (or tap) an island or its pill: the island rises and turns in a
 *    glowing compass ring, and a card offers "Fly to Globe". The button, a
 *    click, or a second tap scrolls to the globe with that country picked.
 *  - Scrolling pins the hero and flies three acts: golden morning, azure
 *    cruise, golden hour, then dives into the atlas. Scrolling back reverses.
 *
 * Native scrolling is never touched: ScrollTrigger only reads the position.
 * Reduced motion: a still panorama; hover, pills and cards still work.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { flagSrc } from '@/components/Flag';
import type { Flight, HeroDiorama, IslandSpec, Landmark } from '@/components/home/heroDiorama';

const ISLANDS: { slug: string; landmark: Landmark; place: string; hook: string }[] = [
  { slug: 'india', landmark: 'india', place: 'Taj Mahal, Agra', hook: 'A marble love letter on the Yamuna.' },
  { slug: 'japan', landmark: 'japan', place: 'Mount Fuji, Fujiyoshida', hook: 'Sakura season paints the whole country pink.' },
  { slug: 'france', landmark: 'france', place: 'Eiffel Tower, Paris', hook: 'Café terraces fill up long before lunch.' },
  { slug: 'egypt', landmark: 'egypt', place: 'Pyramids of Giza', hook: 'Standing tall for more than 4,500 years.' },
  { slug: 'italy', landmark: 'italy', place: 'Colosseum, Rome', hook: 'Once filled with around 50,000 cheering Romans.' },
  { slug: 'united-kingdom', landmark: 'uk', place: 'Big Ben, London', hook: 'The great clock has kept time since 1859.' },
  { slug: 'china', landmark: 'china', place: 'Temple of Heaven, Beijing', hook: 'Built in 1420 to pray for good harvests.' },
  { slug: 'uae', landmark: 'uae', place: 'Burj Khalifa, Dubai', hook: 'At 828 metres, the tallest building on Earth.' },
  { slug: 'usa', landmark: 'usa', place: 'Golden Gate Bridge, San Francisco', hook: 'Its famous colour is called International Orange.' },
  { slug: 'brazil', landmark: 'brazil', place: 'Christ the Redeemer, Rio', hook: 'Arms open wide over Rio since 1931.' },
  { slug: 'australia', landmark: 'australia', place: 'Sydney Opera House', hook: 'Its sails wear more than a million tiles.' },
  { slug: 'singapore', landmark: 'singapore', place: 'Marina Bay Sands', hook: 'A rooftop park balanced on three towers.' },
];
const INFO = Object.fromEntries(ISLANDS.map((s) => [s.landmark, s]));
const ACTS = ['Golden morning', 'Cloud cruise', 'Golden hour'];

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
  const cue = useRef<HTMLDivElement>(null);
  const dots = useRef<HTMLDivElement>(null);
  const pills = useRef<(HTMLButtonElement | null)[]>([]);
  const sceneRef = useRef<HeroDiorama | null>(null);
  const placedRef = useRef<IslandSpec[]>([]);
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

  // Hand the pill elements to the scene once they exist.
  useEffect(() => {
    sceneRef.current?.setPills(pills.current);
  }, [placed]);

  /* ------------------------------ Pointer ------------------------------ */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const onUi = (e: Event) => !!(e.target as Element | null)?.closest?.('.sky-pill, .spot-anchor');
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

  /* ------------------------ Scroll: the three acts ------------------------ */
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
            end: desktop ? '+=260%' : '+=155%',
            scrub: 0.75,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (st) => {
              const act = st.progress < 0.28 ? 0 : st.progress < 0.68 ? 1 : 2;
              if (dots.current && dots.current.dataset.act !== String(act)) dots.current.dataset.act = String(act);
            },
          },
        });
        tl.to(f, { p: 1, duration: 1 }, 0)
          .to(copy.current, { yPercent: -18, scale: 1.08, opacity: 0, duration: 0.2, ease: 'power2.in' }, 0)
          .to([hint.current, cue.current], { opacity: 0, duration: 0.06 }, 0)
          .to(wash.current, { opacity: 1, duration: 0.04, ease: 'power1.in' }, 0.96);
        return () => {
          f.p = 0;
        };
      };
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => build(true));
      mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => build(false));
    }, el);
    return () => ctx.revert();
  }, []);

  const focused = focus !== null ? placed[focus] : null;
  const info = focused ? INFO[focused.landmark] : null;

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

      {/* A flag pill under every island; the scene places and scales them */}
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
          onPointerEnter={() => {
            const sc = sceneRef.current;
            if (!sc) return;
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
          <img src={flagSrc(s.slug)} alt="" width={20} height={20} />
          {s.name}
        </button>
      ))}

      {/* Destination spotlight card beside the focused island */}
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
              initial={{ opacity: 0, scale: 0.86, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            >
              <div className="spot-head">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagSrc(focused.slug)} alt="" width={40} height={40} />
                <div className="min-w-0">
                  <p className="spot-name">{focused.name}</p>
                  <p className="spot-place">{info.place}</p>
                </div>
              </div>
              <p className="spot-hook">{info.hook}</p>
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

      {/* Keyboard and screen reader route to every island */}
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

      {/* Which act of the flight you are in */}
      <div ref={dots} data-act="0" className="act-dots pointer-events-none absolute right-5 top-1/2 z-20 hidden -translate-y-1/2 md:flex" aria-hidden>
        {ACTS.map((a, i) => (
          <span key={a} data-i={i} title={a} />
        ))}
      </div>

      {/* GSAP fades the wrapper on scroll; the pill itself fades after the first touch. */}
      <div ref={hint} aria-hidden className="diorama-hint-wrap pointer-events-none absolute inset-x-0 z-20 flex justify-center">
        <p className={`diorama-hint ${touched || focused ? 'is-gone' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M8 9l-4 3 4 3M16 9l4 3-4 3M4 12h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Drag to tilt the sky
        </p>
      </div>
      <div ref={cue} aria-hidden className="diorama-cue pointer-events-none absolute bottom-5 left-1/2 z-20">
        <span className="diorama-cue-dot" />
      </div>
      <div ref={wash} aria-hidden className="diorama-wash pointer-events-none absolute inset-0 z-40" />
    </section>
  );
}
