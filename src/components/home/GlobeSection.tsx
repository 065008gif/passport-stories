'use client';

/**
 * "Explore the map": the 3D globe as one section of the home page. Drag to
 * spin, tap a flag to open a clean card with that country's key facts.
 * The 3D code loads only when this section is near the screen.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { flagSrc } from '@/components/Flag';
import { track } from '@/lib/analytics';
import type { FlightWorld as FW, Frame } from '@/components/flight/world';

export interface GlobeCountry {
  slug: string;
  name: string;
  airport: string;
  region: string;
  lat: number;
  lng: number;
  tagline: string;
  facts: { label: string; value: string }[];
  capital: string;
  language: string;
  deep: boolean;
}

const TEXTURES = { day: '/textures/earth-day.webp', night: '/textures/earth-night.webp' };
const IDLE = 0.1;

export default function GlobeSection({ countries, startIndex }: { countries: GlobeCountry[]; startIndex: number }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pins = useRef<(HTMLButtonElement | null)[]>([]);
  const spin = useRef({ x: 0, y: 0, v: IDLE, dragging: false, lastX: 0, lastY: 0, lastT: 0, moved: 0 });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pick, setPick] = useState<GlobeCountry | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let world: FW | null = null;
    let raf = 0;
    let visible = false;
    let disposed = false;
    let last = performance.now();
    const frame: Frame = { progress: 0, free: 1, x: 0, y: 0, scale: 1, dragX: 0, dragY: 0, time: 0 };
    const point = { x: 0, y: 0, visible: false };
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
      frame.scale = (Math.min(w, h) * 0.43) / disc.r;
    };

    const tick = (now: number) => {
      raf = 0;
      if (!world || disposed) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = spin.current;
      if (!s.dragging) {
        const target = reduce ? 0 : IDLE;
        s.v += (target - s.v) * Math.min(1, dt * 1.5);
        s.x += s.v * dt;
      }
      frame.time = now / 1000;
      frame.dragX = s.x;
      frame.dragY = s.y;
      world.render(frame);
      pins.current.forEach((pin, i) => {
        if (!pin) return;
        world!.project(i, point);
        pin.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%) scale(${point.visible ? 1 : 0})`;
        pin.style.pointerEvents = point.visible ? 'auto' : 'none';
      });
      if (visible) raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (world || disposed) return;
      import('@/components/flight/world')
        .then((mod) => {
          if (disposed || !canvas.current) return;
          const places = countries.map((c) => ({ lat: c.lat, lng: c.lng }));
          world = new mod.FlightWorld(canvas.current, places, [startIndex, (startIndex + 1) % places.length], TEXTURES);
          // Face India first.
          spin.current.x = 0;
          fit();
          setReady(true);
          if (visible && !raf) raf = requestAnimationFrame(tick);
        })
        .catch(() => setFailed(true));
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) {
          start();
          last = performance.now();
          if (world && !raf) raf = requestAnimationFrame(tick);
        }
      },
      { rootMargin: '300px 0px' },
    );
    io.observe(el);
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => {
      disposed = true;
      io.disconnect();
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      world?.dispose();
    };
  }, [countries, startIndex]);

  const down = (e: React.PointerEvent) => {
    const s = spin.current;
    s.dragging = true;
    s.moved = 0;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.lastT = performance.now();
    s.v = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    const s = spin.current;
    if (!s.dragging) return;
    const now = performance.now();
    const dx = (e.clientX - s.lastX) / 160;
    const dy = (e.clientY - s.lastY) / 220;
    const dt = Math.max(0.001, (now - s.lastT) / 1000);
    s.x += dx;
    s.y = Math.max(-0.9, Math.min(0.9, s.y + dy));
    s.v = s.v * 0.5 + Math.max(-8, Math.min(8, dx / dt)) * 0.5;
    s.moved += Math.abs(e.clientX - s.lastX) + Math.abs(e.clientY - s.lastY);
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.lastT = now;
  };
  const up = () => {
    const s = spin.current;
    if (s.dragging && s.moved > 6) track('globe_spun', { where: 'home-map' });
    s.dragging = false;
  };

  return (
    <div className="relative grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
      <div ref={box} className="globe-stage relative aspect-square w-full touch-pan-y select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div aria-hidden className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(108,76,245,.25),transparent_65%)]" />
        <canvas ref={canvas} aria-hidden className={`absolute inset-0 h-full w-full cursor-grab transition-opacity duration-700 active:cursor-grabbing ${ready ? 'opacity-100' : 'opacity-0'}`} />
        {!ready && !failed && <div aria-hidden className="planet-fallback absolute inset-[12%] animate-pulse rounded-full opacity-60" />}
        {countries.map((c, i) => (
          <button
            key={c.slug}
            ref={(el) => {
              pins.current[i] = el;
            }}
            onClick={() => {
              setPick(c);
              track('map_country_opened', { country: c.slug, where: 'home-globe' });
            }}
            className={`globe-pin absolute left-0 top-0 ${pick?.slug === c.slug ? 'is-picked' : ''}`}
            style={{ transform: 'scale(0)' }}
            aria-label={`${c.name}: show facts`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagSrc(c.slug)} alt="" width={30} height={30} />
          </button>
        ))}
        <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-ink shadow">Drag to spin · tap a flag</p>
      </div>

      <div className="min-h-[20rem]" aria-live="polite">
        {pick ? (
          <article className="rounded-[2rem] border-2 border-ink bg-paper p-6 text-ink shadow-[0_8px_0_#24123D] sm:p-7">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagSrc(pick.slug)} alt="" width={48} height={48} className="h-12 w-12 rounded-full object-cover ring-2 ring-ink/15" />
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-ink/55">
                  {pick.region} · {pick.airport}
                </p>
                <h3 className="h-display text-3xl leading-none">{pick.name}</h3>
              </div>
              <button onClick={() => setPick(null)} className="ml-auto rounded-full px-2 text-2xl leading-none text-ink/50 hover:text-ink" aria-label="Close">
                ×
              </button>
            </div>
            <p className="mt-3 text-ink/80">{pick.tagline}</p>
            <dl className="mt-5 grid grid-cols-2 gap-2">
              {[{ label: 'Capital', value: pick.capital }, { label: 'Language', value: pick.language }, ...pick.facts].slice(0, 6).map((f) => (
                <div key={f.label} className="rounded-2xl bg-[#FFF1E6] px-3 py-2.5">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink/55">{f.label}</dt>
                  <dd className="mt-0.5 text-sm font-extrabold leading-snug">{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/countries/${pick.slug}${pick.deep ? '#culture' : ''}`} className="btn btn-ink">
                Explore {pick.name} →
              </Link>
              <Link href={`/compare/india-vs-${pick.slug === 'india' ? 'japan' : pick.slug}`} className="btn btn-ghost">
                Compare with India
              </Link>
            </div>
          </article>
        ) : (
          <div>
            <p className="kicker text-sun">Explore the map</p>
            <h2 className="h-display mt-3 text-4xl leading-[1.02] sm:text-6xl" data-split>
              Spin the planet. <em className="text-coral">Pick a place.</em>
            </h2>
            <p className="mt-4 max-w-md text-lg text-cream/80">Every flag opens a quick card: the capital, the language and a few everyday numbers. Then dive in.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {countries
                .filter((c) => c.deep)
                .map((c) => (
                  <button key={c.slug} onClick={() => setPick(c)} className="chip bg-paper">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flagSrc(c.slug)} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                    {c.name}
                  </button>
                ))}
            </div>
            <p className="mt-6 text-sm text-cream/65">
              Prefer the guided version?{' '}
              <Link href="/fly" className="link-u font-bold text-coral">
                Take the one-minute flight →
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
