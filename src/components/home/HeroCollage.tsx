'use client';

/**
 * HERO: one connected picture of the world.
 *
 * Real photos and live clips from many countries float at different depths
 * around the headline. A dotted flight route links them and a small plane
 * flies along it. The whole scene tilts gently with the pointer (3D depth),
 * and as you scroll away the cards drift apart like a camera pulling back.
 *
 * Everything moves with transform and opacity only. Reduced motion: a still
 * collage, no plane, no tilt.
 */
import { useEffect, useRef } from 'react';
import { flagSrc } from '@/components/Flag';
import LiveMedia from '@/components/home/LiveMedia';
import { PLACES, MOMENTS, pexels, pexelsSet } from '@/data/places';
import { COUNTRY_CLIPS } from '@/data/media';

type Card = {
  key: string;
  flag: string;
  label: string;
  /** desktop: left %, top %, width (vw); phone: left %, top %, width (vw) */
  d: [number, number, number];
  m?: [number, number, number];
  ratio: string;
  depth: number;
  tilt: number;
  /** which way it drifts when you scroll away */
  dir: [number, number];
  photo?: { id: number; alt: string };
  clip?: keyof typeof COUNTRY_CLIPS;
};

const CARDS: Card[] = [
  { key: 'japan', flag: 'japan', label: 'Fujiyoshida, Japan', d: [2.5, 9, 15], m: [-4, 47, 38], ratio: '3/4', depth: 0.7, tilt: -6, dir: [-1, -0.4], photo: { id: PLACES.japan.photo, alt: PLACES.japan.alt } },
  { key: 'italy', flag: 'italy', label: 'Amalfi, Italy', d: [21, 4, 11], ratio: '1/1', depth: 1.25, tilt: -3, dir: [-0.6, -1], photo: { id: PLACES.italy.photo, alt: PLACES.italy.alt } },
  { key: 'tokyo', flag: 'japan', label: 'Shibuya, Tokyo', d: [69, 3, 12.5], ratio: '4/3', depth: 0.9, tilt: 3, dir: [0.5, -1], clip: 'japan' },
  { key: 'egypt', flag: 'egypt', label: 'Giza, Egypt', d: [83, 11, 15.5], m: [64, 45, 38], ratio: '4/5', depth: 0.55, tilt: 5, dir: [1, -0.3], photo: { id: PLACES.egypt.photo, alt: PLACES.egypt.alt } },
  { key: 'holi', flag: 'india', label: 'Holi, India', d: [6, 57, 14], m: [29, 57, 42], ratio: '4/5', depth: 1.05, tilt: 4, dir: [-1, 0.6], photo: { id: MOMENTS.holi.photo, alt: MOMENTS.holi.alt } },
  { key: 'market', flag: 'india', label: 'Street market, India', d: [24, 70, 19], ratio: '16/10', depth: 0.45, tilt: -2, dir: [-0.4, 1], clip: 'india' },
  { key: 'hawker', flag: 'singapore', label: 'Hawker stall, Singapore', d: [57, 72, 13], ratio: '1/1', depth: 0.95, tilt: -4, dir: [0.4, 1], photo: { id: MOMENTS.hawker.photo, alt: MOMENTS.hawker.alt } },
  { key: 'mexico', flag: 'mexico', label: 'Guanajuato, Mexico', d: [78, 56, 15], m: [1, 76, 34], ratio: '3/4', depth: 0.75, tilt: 6, dir: [1, 0.6], photo: { id: PLACES.mexico.photo, alt: PLACES.mexico.alt } },
  { key: 'canada', flag: 'canada', label: 'Banff, Canada', m: [63, 78, 36], d: [-50, -50, 0], ratio: '1/1', depth: 0.8, tilt: -5, dir: [1, 1], photo: { id: PLACES.canada.photo, alt: PLACES.canada.alt } },
];

// The flight route, in the same 0 to 100 space as the card positions (desktop).
const ROUTE = 'M 10 30 C 20 12, 28 8, 27 13 S 50 2, 75 9 S 98 30, 90 40 S 92 78, 85 74 S 66 96, 63 85 S 44 98, 33 86 S 4 90, 13 74 S 2 50, 10 30';

export default function HeroCollage({ headline, tagline }: { headline: React.ReactNode; tagline: string }) {
  const root = useRef<HTMLElement>(null);
  const plane = useRef<HTMLDivElement>(null);
  const path = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(pointer: fine)').matches;
    const target = { x: 0, y: 0 };
    const now = { x: 0, y: 0, s: 0 };
    let raf = 0;
    let visible = true;
    let t0 = performance.now();
    const len = path.current?.getTotalLength() || 1;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };

    const tick = (t: number) => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const s = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height * 0.85)));
      now.x += (target.x - now.x) * 0.06;
      now.y += (target.y - now.y) * 0.06;
      now.s += (s - now.s) * 0.18;
      el.style.setProperty('--px', now.x.toFixed(4));
      el.style.setProperty('--py', now.y.toFixed(4));
      el.style.setProperty('--sp', now.s.toFixed(4));
      // The plane: one lap of the route every 26 seconds.
      const p = path.current;
      const pl = plane.current;
      if (p && pl) {
        const k = (((t - t0) / 26000) % 1) * len;
        const a = p.getPointAtLength(k);
        const b = p.getPointAtLength((k + 0.6) % len);
        const ang = (Math.atan2(((b.y - a.y) * r.height) / 100, ((b.x - a.x) * r.width) / 100) * 180) / Math.PI;
        pl.style.transform = `translate(${(a.x / 100) * r.width}px, ${(a.y / 100) * r.height}px) translate(-50%, -50%) rotate(${ang}deg)`;
      }
      if (visible) raf = requestAnimationFrame(tick);
    };

    if (reduce) {
      el.classList.add('is-still');
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) {
        t0 = performance.now() - 4000;
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(el);
    if (fine) {
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <section ref={root} className="hero-world relative isolate overflow-hidden" aria-labelledby="hero-title">
      {/* Soft sunlit sky: ivory into peach and a breath of turquoise */}
      <div aria-hidden className="hero-sky absolute inset-0 -z-20" />
      <div aria-hidden className="hero-glow hero-glow-a" />
      <div aria-hidden className="hero-glow hero-glow-b" />
      <div aria-hidden className="hero-glow hero-glow-c" />

      <div className="hero-stage absolute inset-0 -z-10">
        <div className="hero-scene absolute inset-0">
          {/* The route that links every place (desktop) */}
          <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="none" className="hero-route absolute inset-0 hidden h-full w-full lg:block">
            <path ref={path} d={ROUTE} fill="none" stroke="#1F2A44" strokeOpacity=".28" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <div ref={plane} aria-hidden className="hero-plane absolute left-0 top-0 hidden lg:block">
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path d="M21 12.6v-1.2L13.5 7V2.8a1.5 1.5 0 0 0-3 0V7L3 11.4v1.2l7.5-2.1v4.6l-2 1.5v1.1l3.5-.9 3.5.9v-1.1l-2-1.5v-4.6z" fill="#FF6B5B" transform="rotate(90 12 12)" />
            </svg>
          </div>

          {CARDS.map((c, i) => (
            <figure
              key={c.key}
              className={`hero-card absolute ${c.m ? '' : 'max-lg:hidden'} ${c.d[2] ? '' : 'lg:hidden'}`}
              style={
                {
                  '--x': `${c.d[0]}%`,
                  '--y': `${c.d[1]}%`,
                  '--w': `${c.d[2]}vw`,
                  '--mx': `${c.m?.[0] ?? 0}%`,
                  '--my': `${c.m?.[1] ?? 0}%`,
                  '--mw': `${c.m?.[2] ?? 0}vw`,
                  '--d': c.depth,
                  '--r': `${c.tilt}deg`,
                  '--dx': c.dir[0],
                  '--dy': c.dir[1],
                  '--i': i,
                } as React.CSSProperties
              }
            >
              <div className="hero-card-in">
                <div className="hero-photo" style={{ aspectRatio: c.ratio }}>
                  {c.clip ? (
                    <LiveMedia clip={COUNTRY_CLIPS[c.clip]} className="absolute inset-0" eager={i < 4} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pexels(c.photo!.id, 640)}
                      srcSet={pexelsSet(c.photo!.id, [400, 640, 960])}
                      sizes="(min-width: 1024px) 18vw, 40vw"
                      alt={c.photo!.alt}
                      loading={i < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  {c.clip && (
                    <span className="hero-live" aria-hidden>
                      <i /> Live
                    </span>
                  )}
                </div>
                <figcaption className="hero-tag">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={flagSrc(c.flag)} alt="" width={16} height={16} />
                  {c.label}
                </figcaption>
              </div>
            </figure>
          ))}
        </div>
      </div>

      {/* The words: one line and one short tagline */}
      <div className="hero-copy relative mx-auto flex min-h-[calc(100svh-var(--header))] max-w-[44rem] flex-col items-center px-5 pb-[52vh] pt-[7vh] text-center sm:pb-[40vh] lg:justify-center lg:pb-[8vh] lg:pt-0">
        <h1 id="hero-title" className="hero-title h-display text-[2.6rem] leading-[0.98] text-ink sm:text-6xl lg:text-[5.4rem]">
          {headline}
        </h1>
        <p className="hero-tagline mt-5 max-w-[34rem] text-[1.05rem] leading-relaxed text-ink/75 sm:text-xl">{tagline}</p>
        <a href="#explore" className="hero-cue mt-8 hidden items-center gap-2 text-sm font-bold text-ink/60 hover:text-coral lg:inline-flex">
          <span className="hero-cue-dot" aria-hidden />
          Scroll to explore the globe
        </a>
      </div>
    </section>
  );
}
