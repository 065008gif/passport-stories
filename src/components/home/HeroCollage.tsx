'use client';

/**
 * HERO: the sunlit 3D postcard flight tunnel.
 *
 * The 3D world lives in heroTunnelScene.ts (plain three.js). This shell owns
 * the DOM: the words, the passport stamp tag under a focused postcard, the
 * drag hint, pointer input and the GSAP ScrollTrigger fly-through.
 *
 *  - Drag or flick sideways to orbit the tunnel; it coasts and settles.
 *  - Hover (or tap on a phone) a postcard: it leaps forward, the sky takes
 *    its colour and a tag offers "Fly there". Clicking it (or a second tap)
 *    scrolls to the globe with that country picked (see HomeAtlas).
 *  - Scrolling pins the hero on laptops and flies the camera down the
 *    tunnel, then washes into the atlas. Scrolling back reverses it.
 *
 * Native scrolling is never touched: the wheel and touch scroll the page as
 * usual, ScrollTrigger only reads the position. Reduced motion: a still,
 * layered scene, no flight, hover still works.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { flagSrc } from '@/components/Flag';
import { PLACES, MOMENTS, pexels } from '@/data/places';
import { COUNTRY_CLIPS, HERO_CLIP } from '@/data/media';
import type { Flight, HeroTunnelScene, Tone, TunnelCard } from '@/components/home/heroTunnelScene';

type Spec = { key: string; slug: string; spot: string; photo?: number; poster?: string; video?: string; shape: 'tall' | 'wide'; tone: Tone; phone?: boolean };

const poster = (url: string, w: number) => url.replace(/w=\d+/, `w=${w}`);
const place = (slug: string) => ({ slug, spot: PLACES[slug].spot, photo: PLACES[slug].photo });

/** Nearest first. `phone` marks the seven kept on small screens. */
const SPECS: Spec[] = [
  { key: 'japan', ...place('japan'), shape: 'tall', tone: 'coral', phone: true },
  { key: 'italy', ...place('italy'), shape: 'wide', tone: 'sky', phone: true },
  { key: 'holi', slug: 'india', spot: 'Holi', photo: MOMENTS.holi.photo, shape: 'wide', tone: 'coral', phone: true },
  { key: 'tokyo', slug: 'japan', spot: 'Shibuya', poster: COUNTRY_CLIPS.japan.poster, video: COUNTRY_CLIPS.japan.video, shape: 'wide', tone: 'sky' },
  { key: 'egypt', ...place('egypt'), shape: 'wide', tone: 'sun', phone: true },
  { key: 'mexico', ...place('mexico'), shape: 'tall', tone: 'tang', phone: true },
  { key: 'hawker', slug: 'singapore', spot: 'Hawker stall', photo: MOMENTS.hawker.photo, shape: 'tall', tone: 'sun', phone: true },
  { key: 'market', slug: 'india', spot: 'Street market', poster: COUNTRY_CLIPS.india.poster, video: COUNTRY_CLIPS.india.video, shape: 'wide', tone: 'tang' },
  { key: 'canada', ...place('canada'), shape: 'wide', tone: 'teal', phone: true },
  { key: 'korea', ...place('south-korea'), shape: 'tall', tone: 'sky' },
  { key: 'rome', slug: 'italy', spot: 'Piazza Navona', poster: COUNTRY_CLIPS.italy.poster, video: COUNTRY_CLIPS.italy.video, shape: 'wide', tone: 'sun' },
  { key: 'australia', ...place('australia'), shape: 'wide', tone: 'teal' },
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
  const tag = useRef<HTMLDivElement>(null);
  const wash = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HeroTunnelScene | null>(null);
  const cardsRef = useRef<TunnelCard[]>([]);
  const flight = useRef<Flight>({ camZ: 6, bank: 0, dive: 0 });

  const [cards, setCards] = useState<TunnelCard[]>([]);
  const [focus, setFocus] = useState<number | null>(null);
  const [kbd, setKbd] = useState(false);
  const [dragged, setDragged] = useState(false);

  // "Same planet. Different lives." The second sentence gets the sunshine highlight.
  const [lead, glow] = useMemo(() => {
    const at = headline.indexOf('. ');
    return at > 0 ? [headline.slice(0, at + 1), headline.slice(at + 2)] : [headline, ''];
  }, [headline]);

  const pick = useCallback(
    (i: number) => {
      const c = cardsRef.current[i];
      if (c) onPick(c.slug);
    },
    [onPick],
  );

  /* --------------------------- The 3D scene --------------------------- */
  useEffect(() => {
    const el = root.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const phone = window.innerWidth < 768;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const list: TunnelCard[] = SPECS.filter((s) => !phone || s.phone).map((s) => ({
      key: s.key,
      slug: s.slug,
      label: `${s.spot}, ${names[s.slug] ?? s.slug}`,
      image: s.photo ? pexels(s.photo, phone ? 640 : 960) : poster(s.poster!, phone ? 640 : 960),
      video: s.video,
      shape: s.shape,
      tone: s.tone,
    }));
    cardsRef.current = list;
    setCards(list);

    let scene: HeroTunnelScene | null = null;
    let disposed = false;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    let burst: gsap.core.Tween | null = null;
    let videoTimer = 0;

    import('@/components/home/heroTunnelScene')
      .then((mod) => {
        if (disposed) return;
        try {
          scene = new mod.HeroTunnelScene(cv, list, { phone, reduce, heroImage: poster(HERO_CLIP.poster, phone ? 900 : 1600), flight: flight.current });
        } catch {
          return; // no WebGL: the CSS sky and the words still stand on their own
        }
        sceneRef.current = scene;
        scene.onFocus = (i) => setFocus(i);
        scene.setTag(tag.current);
        scene.resize(el.clientWidth, el.clientHeight);
        el.dataset.ready = 'true';
        // Opening burst: from a tight cluster behind the centre out to the tunnel.
        if (!reduce) {
          burst = gsap.to(scene.bursts, { b: 1, duration: 1.15, ease: 'back.out(1.35)', stagger: 0.045, delay: 0.1 });
          videoTimer = window.setTimeout(() => scene?.startVideos(), 1800);
        }
        ro = new ResizeObserver(() => scene?.resize(el.clientWidth, el.clientHeight));
        ro.observe(el);
        // Draw only while the hero (or its pinned flight) is on screen.
        io = new IntersectionObserver(([e]) => (e.isIntersecting ? scene?.start() : scene?.stop()));
        io.observe(el);
      })
      .catch(() => {});

    return () => {
      disposed = true;
      window.clearTimeout(videoTimer);
      burst?.kill();
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
    const onTag = (e: Event) => !!(e.target as Element | null)?.closest?.('.tunnel-tag-anchor');
    const move = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s || onTag(e)) return;
      const [x, y] = local(e);
      s.pointerMove(x, y, e.pointerType);
      if (s.dragDistance > 10) setDragged(true);
    };
    const down = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s || onTag(e) || e.button > 0) return;
      setKbd(false);
      const [x, y] = local(e);
      s.pointerMove(x, y, e.pointerType);
      s.pointerDown(x, y);
    };
    const up = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s) return;
      const { tap, hit } = s.pointerUp(e.type === 'pointercancel');
      if (!tap || onTag(e)) return;
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

  /* ------------------------ Scroll: the fly-through ------------------------ */
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
            end: desktop ? '+=145%' : '+=95%',
            scrub: 0.75,
            pin: desktop,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        tl.to(copy.current, { scale: 1.16, yPercent: -14, opacity: 0, duration: 0.28, ease: 'power2.in' }, 0)
          .to([hint.current, cue.current], { opacity: 0, duration: 0.08 }, 0)
          .to(f, { dive: 1, duration: 0.4, ease: 'power2.inOut' }, 0)
          .to(f, { camZ: -14, duration: 0.75, ease: 'power2.inOut' }, 0.15)
          .to(f, { bank: 0.14, duration: 0.37, ease: 'sine.inOut' }, 0.15)
          .to(f, { bank: 0, duration: 0.38, ease: 'sine.inOut' }, 0.52)
          .to(wash.current, { opacity: 1, duration: 0.22, ease: 'power1.in' }, 0.78);
        return () => {
          f.camZ = 6;
          f.bank = 0;
          f.dive = 0;
        };
      };
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => build(true));
      mm.add('(max-width: 767px) and (prefers-reduced-motion: no-preference)', () => build(false));
    }, el);
    return () => ctx.revert();
  }, []);

  const focused = focus !== null ? cards[focus] : null;

  return (
    <section ref={root} className="hero-tunnel relative isolate overflow-hidden" aria-labelledby="hero-title">
      <canvas ref={canvas} aria-hidden className="tunnel-canvas absolute inset-0 h-full w-full" />

      {/* The words, in the open corridor of the tunnel */}
      <div ref={copy} className="tunnel-copy pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-5 text-center">
        {/* GSAP owns the outer opacity; this inner layer dims on phones while a postcard is spotlighted. */}
        <div className={`tunnel-copy-inner ${focused ? 'is-dim' : ''}`}>
          <h1 id="hero-title" className="tunnel-title">
            <span className="block">{lead}</span>
            {glow && <span className="tunnel-gold block">{glow}</span>}
          </h1>
          <p className="tunnel-tagline mx-auto">{tagline}</p>
        </div>
      </div>

      {/* Passport stamp tag, pinned under the focused postcard by the scene */}
      <div
        ref={tag}
        className="tunnel-tag-anchor absolute left-0 top-0 z-30"
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
            <motion.div
              key={focused.key}
              className={`tunnel-tag ${kbd ? 'is-kbd' : ''}`}
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.97, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] } }}
              transition={{ type: 'spring', duration: 0.38, bounce: 0.22 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagSrc(focused.slug)} alt="" width={28} height={28} className="tunnel-tag-flag" />
              <span className="tunnel-tag-label">{focused.label}</span>
              <button type="button" className="tunnel-fly" onClick={() => focus !== null && pick(focus)} tabIndex={-1}>
                Fly there
                <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
                  <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard and screen reader route to every postcard */}
      <ul className="sr-only">
        {cards.map((c, i) => (
          <li key={c.key}>
            <button
              type="button"
              onFocus={() => {
                setKbd(true);
                sceneRef.current?.setFocus(i);
              }}
              onBlur={() => sceneRef.current?.setFocus(null)}
              onClick={() => pick(i)}
            >
              Fly to {c.label} on the globe
            </button>
          </li>
        ))}
      </ul>

      {/* GSAP fades the wrapper on scroll; the pill itself fades on the first drag. */}
      <div ref={hint} aria-hidden className="tunnel-hint-wrap pointer-events-none absolute inset-x-0 z-20 flex justify-center">
        <p className={`tunnel-hint ${dragged || focused ? 'is-gone' : ''}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path d="M8 9l-4 3 4 3M16 9l4 3-4 3M4 12h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Drag to explore the sky
        </p>
      </div>
      <div ref={cue} aria-hidden className="tunnel-cue pointer-events-none absolute bottom-5 left-1/2 z-20">
        <span className="tunnel-cue-dot" />
      </div>
      <div aria-hidden className="tunnel-foot pointer-events-none absolute inset-x-0 bottom-0 z-[5]" />
      <div ref={wash} aria-hidden className="tunnel-wash pointer-events-none absolute inset-0 z-40" />
    </section>
  );
}
