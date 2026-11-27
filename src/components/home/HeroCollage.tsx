'use client';

/**
 * HERO: the sunlit aero window corridor.
 *
 * A 500vh runway (300vh on phones) with a sticky stage inside it. Native
 * scroll sets the target progress; the 3D scene (heroCorridor.ts) eases
 * toward it with weight, so one wheel notch moves only a few percent and the
 * whole flight takes several calm scrolls. Nothing hijacks the wheel.
 *
 *  - Sixteen airplane window portals line a corridor into the horizon; the
 *    jet glides ahead of the camera and dives into the atlas at the end.
 *  - Each window in range wears a flag badge on its rim. Hovering a window
 *    (once nothing is scrolling and the pointer has moved on purpose) lifts
 *    it and offers "Explore on Globe"; a click flies to the globe.
 *  - A glass telemetry strip counts destinations and jumps between chapters.
 *
 * Reduced motion: the camera follows the scroll without easing, and nothing
 * drifts on its own.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flagSrc } from '@/components/Flag';
import { track } from '@/lib/analytics';
import { PLACES, pexels } from '@/data/places';
import { COUNTRY_CLIPS } from '@/data/media';
import type { Flight, HeroCorridor, PortalSpec } from '@/components/home/heroCorridor';
import { jetSeam } from '@/components/home/jetSeam';

/** The corridor, nearest first, grouped into the telemetry chapters. */
const ROUTE: { slug: string; chapter: number }[] = [
  { slug: 'india', chapter: 0 },
  { slug: 'japan', chapter: 0 },
  { slug: 'china', chapter: 0 },
  { slug: 'singapore', chapter: 0 },
  { slug: 'uae', chapter: 0 },
  { slug: 'australia', chapter: 0 },
  { slug: 'france', chapter: 1 },
  { slug: 'italy', chapter: 1 },
  { slug: 'united-kingdom', chapter: 1 },
  { slug: 'netherlands', chapter: 1 },
  { slug: 'sweden', chapter: 1 },
  { slug: 'egypt', chapter: 1 },
  { slug: 'south-africa', chapter: 1 },
  { slug: 'usa', chapter: 2 },
  { slug: 'mexico', chapter: 2 },
  { slug: 'brazil', chapter: 2 },
];
const CHAPTERS = ['Asia', 'Europe', 'Americas', 'Globe'];
const CLIP: Record<string, keyof typeof COUNTRY_CLIPS> = { india: 'india', japan: 'japan', italy: 'italy' };
const clamp = (v: number) => Math.min(1, Math.max(0, v));

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
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const tele = useRef<HTMLDivElement>(null);
  const foot = useRef<HTMLDivElement>(null);
  const badges = useRef<(HTMLButtonElement | null)[]>([]);
  const sceneRef = useRef<HeroCorridor | null>(null);
  const flight = useRef<Flight>({ target: 0, p: 0 });
  const chapterP = useRef<number[]>([0, 0.3, 0.62, 1]);

  const [focus, setFocus] = useState<number | null>(null);

  const specs: PortalSpec[] = useMemo(
    () =>
      ROUTE.map(({ slug }) => ({
        slug,
        name: names[slug] ?? slug,
        spot: PLACES[slug].spot,
        image: pexels(PLACES[slug].photo, 1100),
        video: CLIP[slug] ? COUNTRY_CLIPS[CLIP[slug]].video : undefined,
      })),
    [names],
  );

  // "Same planet. Different lives." The second sentence gets the sunlit gold.
  const [lead, glow] = useMemo(() => {
    const at = headline.indexOf('. ');
    return at > 0 ? [headline.slice(0, at + 1), headline.slice(at + 2)] : [headline, ''];
  }, [headline]);

  const pick = useCallback(
    (i: number) => {
      const s = ROUTE[i];
      if (s) onPick(s.slug);
    },
    [onPick],
  );

  /* --------------------------- Native scroll progress --------------------------- */
  const measure = useCallback(() => {
    const sec = section.current;
    const st = stage.current;
    if (!sec || !st) return null;
    // the scroll position where the stage starts to stick under the header
    const top = sec.getBoundingClientRect().top + window.scrollY - (parseFloat(getComputedStyle(st).top) || 0);
    const runway = Math.max(1, sec.offsetHeight - st.offsetHeight);
    return { top, runway };
  }, []);
  // the sticky stage sits right under the measured header
  useEffect(() => {
    const head = document.querySelector('header');
    if (!head) return;
    const set = () => document.documentElement.style.setProperty('--header-h', `${Math.round(head.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const update = () => {
      const m = measure();
      if (!m) return;
      flight.current.target = clamp((window.scrollY - m.top) / m.runway);
    };
    const lock = () => sceneRef.current?.lockHover();
    const onScroll = () => {
      update();
      lock();
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', lock, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', lock);
      window.removeEventListener('resize', update);
    };
  }, [measure]);

  /* --------------------------- The 3D corridor --------------------------- */
  useEffect(() => {
    const el = stage.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const phone = window.innerWidth < 768;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scene: HeroCorridor | null = null;
    let disposed = false;
    let io: IntersectionObserver | null = null;
    let ro: ResizeObserver | null = null;
    let videoTimer = 0;
    let unseam: (() => void) | null = null;
    import('@/components/home/heroCorridor')
      .then((mod) => {
        if (disposed) return;
        try {
          scene = new mod.HeroCorridor(cv, specs, { phone, reduce, flight: flight.current });
        } catch {
          return; // no WebGL: the CSS sky and the words still stand on their own
        }
        sceneRef.current = scene;
        // test hook: the jet on screen, in viewport pixels
        (window as unknown as { __heroJet?: () => unknown }).__heroJet = () => {
          const j = scene?.jetScreen();
          const r = el.getBoundingClientRect();
          return j && { x: Math.round(j.x + r.left), y: Math.round(j.y + r.top), inView: j.x > 0 && j.x < r.width && j.y > 0 && j.y < r.height, visible: !scene?.jetHidden };
        };
        scene.onFocus = (i) => setFocus(i);
        // the one jet: this scene draws it only while the hero owns it
        jetSeam.hero = () => {
          const ps = scene?.jetPose();
          if (!ps) return null;
          const r = el.getBoundingClientRect();
          return { x: r.left + ps.x, y: r.top + ps.y, span: ps.span, q: { x: ps.q.x, y: ps.q.y, z: ps.q.z, w: ps.q.w } };
        };
        unseam = jetSeam.subscribe((o) => {
          if (scene) scene.jetHidden = o !== 'hero';
        });
        scene.setBadges(badges.current);
        chapterP.current = [0, scene.progressFor(ROUTE.findIndex((r) => r.chapter === 1)), scene.progressFor(ROUTE.findIndex((r) => r.chapter === 2)), 1];
        scene.onProgress = (p, reached) => {
          const c = copy.current;
          if (c) {
            const k = Math.min(1, p / 0.14);
            c.style.opacity = String(1 - k);
            c.style.transform = `translate3d(0, ${(-k * 60).toFixed(1)}px, 0) scale(${(1 + k * 0.04).toFixed(3)})`;
          }
          const n = reached;
          if (count.current) count.current.textContent = String(n).padStart(2, '0');
          const t = tele.current;
          if (t) {
            const ch = p >= 0.85 ? 3 : ROUTE[reached - 1].chapter;
            if (t.dataset.chapter !== String(ch)) t.dataset.chapter = String(ch);
            t.style.setProperty('--progress', p.toFixed(3));
          }
          if (foot.current) foot.current.style.opacity = String(Math.min(1, Math.max(0, (p - 0.9) / 0.1)));
        };
        scene.resize(el.clientWidth, el.clientHeight);
        el.dataset.ready = 'true';
        if (!reduce) videoTimer = window.setTimeout(() => scene?.startVideos(), 1500);
        ro = new ResizeObserver(() => scene?.resize(el.clientWidth, el.clientHeight));
        ro.observe(el);
        // draw only while the hero is on screen
        io = new IntersectionObserver(([e]) => (e.isIntersecting ? scene?.start() : scene?.stop()));
        io.observe(el);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      window.clearTimeout(videoTimer);
      io?.disconnect();
      ro?.disconnect();
      unseam?.();
      jetSeam.hero = null;
      scene?.dispose();
      sceneRef.current = null;
    };
  }, [specs]);

  /* ------------------------------ Pointer ------------------------------ */
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const onUi = (e: Event) => !!(e.target as Element | null)?.closest?.('.window-badge, .telemetry');
    let down: { x: number; y: number } | null = null;
    const move = (e: PointerEvent) => {
      const [x, y] = local(e);
      sceneRef.current?.pointerMove(x, y, e.pointerType);
    };
    const press = (e: PointerEvent) => {
      if (onUi(e)) return;
      down = { x: e.clientX, y: e.clientY };
      const [x, y] = local(e);
      sceneRef.current?.pointerMove(x, y, e.pointerType);
    };
    const release = (e: PointerEvent) => {
      const s = sceneRef.current;
      if (!s || !down || onUi(e)) return;
      const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 8;
      down = null;
      if (!tap) return;
      const hit = s.hit();
      if (e.pointerType === 'mouse') {
        if (hit !== null) pick(hit);
      } else if (hit === null) s.setFocus(null);
      else if (hit === s.focus) pick(hit);
      else s.setFocus(hit);
    };
    const leave = () => sceneRef.current?.pointerLeave();
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerdown', press);
      el.removeEventListener('pointerup', release);
      el.removeEventListener('pointerleave', leave);
    };
  }, [pick]);

  const jump = (ch: number) => {
    track('hero_leg_jump', { leg: CHAPTERS[ch].toLowerCase() });
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (ch === 3) {
      document.getElementById('explore')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    const m = measure();
    if (m) window.scrollTo({ top: m.top + m.runway * chapterP.current[ch], behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <section ref={section} className="relative h-[500vh] max-md:h-[300vh]" aria-labelledby="hero-title">
      <div ref={stage} className="hero-stage sticky top-[var(--header-h,72px)] h-[calc(100svh-var(--header-h,72px))] w-full overflow-hidden">
        <canvas ref={canvas} aria-hidden className="corridor-canvas absolute inset-0 h-full w-full" />

        {/* The words, in the open sky at the start of the corridor */}
        <div ref={copy} className="corridor-copy pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-5 text-center">
          <h1 id="hero-title" className="diorama-title">
            <span className="block">{lead}</span>
            {glow && <span className="diorama-gold block">{glow}</span>}
          </h1>
          <p className="diorama-tagline mx-auto">{tagline}</p>
        </div>

        {/* A flag badge on the rim of every window in range; the scene places them */}
        {specs.map((s, i) => (
          <button
            key={s.slug}
            ref={(n) => {
              badges.current[i] = n;
            }}
            type="button"
            className="window-badge absolute left-0 top-0 z-20"
            style={{ opacity: 0, transform: 'translate3d(-999px, -999px, 0)' }}
            aria-label={`${s.name}, ${s.spot}. Explore on the globe`}
            onPointerEnter={(e) => {
              const sc = sceneRef.current;
              if (!sc || (e.pointerType === 'mouse' && !sc.canHover)) return;
              sc.holdFocus = true;
              sc.setFocus(i);
            }}
            onPointerMove={(e) => {
              // the lockout may have ended while the pointer was already on the badge
              const sc = sceneRef.current;
              if (!sc || e.pointerType !== 'mouse' || sc.focus === i || !sc.canHover) return;
              sc.holdFocus = true;
              sc.setFocus(i);
            }}
            onPointerLeave={() => {
              if (sceneRef.current) sceneRef.current.holdFocus = false;
            }}
            onFocus={() => sceneRef.current?.setFocus(i)}
            onClick={() => pick(i)}
          >
            <span className="window-badge-main">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagSrc(s.slug)} alt="" width={22} height={22} />
              <span className="window-badge-name">{s.name}</span>
              <span className="window-badge-spot">{s.spot}</span>
            </span>
            <span className={`window-badge-cta ${focus === i ? 'is-on' : ''}`} aria-hidden>
              Explore on Globe
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>
        ))}

        {/* Glass telemetry: where you are, and the chapters */}
        <div ref={tele} data-chapter="0" className="telemetry absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
          <span className="telemetry-count" aria-live="off">
            <span ref={count}>01</span>
            <span className="telemetry-of"> / 16 Destinations</span>
          </span>
          <span className="telemetry-rule" aria-hidden />
          <nav className="telemetry-chapters" aria-label="Flight chapters">
            {CHAPTERS.map((c, i) => (
              <button key={c} type="button" data-i={i} onClick={() => jump(i)}>
                <span className="telemetry-dot" aria-hidden />
                {c}
              </button>
            ))}
          </nav>
          <span className="telemetry-cue" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M12 5v14M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="telemetry-bar" aria-hidden />
        </div>
        <div ref={foot} aria-hidden className="corridor-foot pointer-events-none absolute inset-x-0 bottom-0 z-[5]" />
      </div>
    </section>
  );
}
