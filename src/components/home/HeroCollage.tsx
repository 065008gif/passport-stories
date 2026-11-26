'use client';

/**
 * HERO: the living postcard portal.
 *
 *  - Background: a sunlit wash (coral, peach, sunshine, sky, turquoise) with
 *    real footage and photos cross-fading slowly underneath, graded bright,
 *    plus film grain and a warm bloom behind the words. Hovering a postcard
 *    tints the ambient glow with that country's colour.
 *  - Real places float on three depth planes (far, mid, near) that follow
 *    the pointer, drift on their own and can be dragged sideways.
 *  - Hover lifts a postcard, pauses it and shows where it is. Click flies
 *    you down to the globe with that country picked (see HomeAtlas).
 *  - A 3D plane loops through the planes, leaving a soft contrail. The 3D
 *    props (Icons8 "3D Casual Life") spring away from the pointer.
 *  - Scrolling away fans the postcards out and fades into the atlas below.
 *
 * Every frame touches only transform and opacity. Reduced motion: nothing
 * moves on its own; the postcards still lift and still work.
 */
import { useEffect, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { flagSrc } from '@/components/Flag';
import LiveMedia from '@/components/home/LiveMedia';
import { PLACES, MOMENTS, pexels } from '@/data/places';
import { COUNTRY_CLIPS, HERO_CLIP } from '@/data/media';

type Plane = 'far' | 'mid' | 'near';
type Tone = 'coral' | 'tang' | 'sun' | 'teal' | 'sky';
type Spot = { x: number; y: number };

interface Postcard {
  key: string;
  /** Country the postcard opens on the globe. */
  slug: string;
  spot: string;
  photo?: number;
  alt?: string;
  clip?: keyof typeof COUNTRY_CLIPS;
  shape: 'tall' | 'wide';
  plane: Plane;
  /** Centre on laptops, in % of the hero. */
  at: Spot;
  /** Centre on phones; left out = not shown on phones. */
  m?: Spot;
  r: number;
  tone: Tone;
}

const place = (slug: string) => ({ slug, spot: PLACES[slug].spot, photo: PLACES[slug].photo, alt: PLACES[slug].alt });

const POSTCARDS: Postcard[] = [
  // near: the big, crisp ones
  { key: 'japan', ...place('japan'), shape: 'tall', plane: 'near', at: { x: 13, y: 50 }, m: { x: 25, y: 17 }, r: -4, tone: 'coral' },
  { key: 'canada', ...place('canada'), shape: 'wide', plane: 'near', at: { x: 87, y: 47 }, r: 3, tone: 'teal' },
  { key: 'holi', slug: 'india', spot: 'Holi', photo: MOMENTS.holi.photo, alt: MOMENTS.holi.alt, shape: 'wide', plane: 'near', at: { x: 29, y: 83 }, m: { x: 30, y: 77 }, r: -2, tone: 'coral' },
  // mid: the interactive arc
  { key: 'italy', ...place('italy'), shape: 'wide', plane: 'mid', at: { x: 30, y: 17 }, m: { x: 73, y: 10 }, r: 3, tone: 'sky' },
  { key: 'tokyo', slug: 'japan', spot: 'Shibuya', clip: 'japan', alt: COUNTRY_CLIPS.japan.alt, shape: 'tall', plane: 'mid', at: { x: 71, y: 19 }, r: -3, tone: 'sky' },
  { key: 'hawker', slug: 'singapore', spot: 'Hawker stall', photo: MOMENTS.hawker.photo, alt: MOMENTS.hawker.alt, shape: 'tall', plane: 'mid', at: { x: 87, y: 82 }, m: { x: 76, y: 81 }, r: 4, tone: 'sun' },
  { key: 'egypt', ...place('egypt'), shape: 'wide', plane: 'mid', at: { x: 67, y: 88 }, r: -3, tone: 'sun' },
  { key: 'mexico', ...place('mexico'), shape: 'wide', plane: 'mid', at: { x: 10, y: 87 }, r: 2, tone: 'tang' },
  // far: small, drifting slowly
  { key: 'uk', ...place('united-kingdom'), shape: 'wide', plane: 'far', at: { x: 9, y: 13 }, m: { x: 56, y: 27 }, r: -3, tone: 'coral' },
  { key: 'korea', ...place('south-korea'), shape: 'tall', plane: 'far', at: { x: 50, y: 10 }, r: 2, tone: 'sky' },
  { key: 'australia', ...place('australia'), shape: 'wide', plane: 'far', at: { x: 93, y: 15 }, m: { x: 81, y: 29 }, r: 3, tone: 'teal' },
];

const DEPTH: Record<Plane, number> = { far: 0.35, mid: 0.7, near: 1.1 };
const TONES: Tone[] = ['coral', 'tang', 'sun', 'teal', 'sky'];

const PROPS = [
  { src: '/hero3d/balloons.webp', cls: 'prop-balloons', d: 0.9, at: { x: 4, y: 33 }, m: { x: 90, y: 66 } },
  { src: '/hero3d/pin.webp', cls: 'prop-pin', d: 0.6, at: { x: 79, y: 31 } },
  { src: '/hero3d/suitcase.webp', cls: 'prop-suitcase', d: 1.2, at: { x: 21, y: 71 }, m: { x: 13, y: 67 } },
  { src: '/hero3d/camera.webp', cls: 'prop-camera', d: 1.0, at: { x: 95, y: 65 } },
];

/** Background layers that cross-fade under the wash. */
const SCENES = [PLACES.canada.photo, PLACES.italy.photo, PLACES.australia.photo];

const PUFFS = 14;

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
  const cards = useRef<(HTMLButtonElement | null)[]>([]);
  const props = useRef<(HTMLImageElement | null)[]>([]);
  const plane = useRef<HTMLImageElement>(null);
  const puffs = useRef<(HTMLSpanElement | null)[]>([]);
  const hover = useRef<number | null>(null);
  const dragged = useRef(0);

  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end start'] });
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -140]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const veil = useTransform(scrollYProgress, [0.1, 0.85], [0, 1]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const st = { px: 0, py: 0, tx: 0, ty: 0, dx: 0, dv: 0, drag: false, lastX: 0, downX: 0 };
    const clock = POSTCARDS.map(() => 0);
    const lift = POSTCARDS.map(() => 0);
    const phase = POSTCARDS.map((_, i) => i * 1.7);
    const kick = PROPS.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 }));
    const trail: { x: number; y: number }[] = [];
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let flight = 0;
    let pointerIn = false;

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = el.clientWidth;
      const H = el.clientHeight;
      const phone = W < 768;
      const p = scrollYProgress.get();

      st.px += (st.tx - st.px) * Math.min(1, dt * 4);
      st.py += (st.ty - st.py) * Math.min(1, dt * 4);
      // Drag: follow the finger, then glide and spring home.
      if (!st.drag) {
        st.dv += -st.dx * 9 * dt;
        st.dv *= Math.exp(-dt * 4.2);
        st.dx += st.dv * dt;
      }

      for (let i = 0; i < POSTCARDS.length; i++) {
        const c = cards.current[i];
        if (!c) continue;
        const pc = POSTCARDS[i];
        const at = phone ? pc.m : pc.at;
        if (!at) continue;
        const d = DEPTH[pc.plane];
        const on = hover.current === i;
        if (!on && !still) clock[i] += dt;
        lift[i] += ((on ? 1 : 0) - lift[i]) * Math.min(1, dt * 10);
        const t = clock[i] + phase[i];
        const driftX = still ? 0 : Math.sin(t * 0.32) * 7 * d;
        const driftY = still ? 0 : Math.cos(t * 0.27) * 9 * d;
        const parX = still ? 0 : -st.px * 28 * d;
        const parY = still ? 0 : -st.py * 18 * d;
        // Fan out from the centre as the page scrolls.
        const vx = at.x - 50;
        const vy = at.y - 50;
        const len = Math.hypot(vx, vy) || 1;
        const fan = p * (phone ? 160 : 300) * (0.6 + d * 0.5);
        const x = driftX + parX + st.dx * d + (vx / len) * fan;
        const y = driftY + parY + (vy / len) * fan - lift[i] * 10;
        const s = 1 + lift[i] * 0.1 + p * 0.12 * d;
        const r = pc.r * (1 - lift[i]);
        c.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(2)}deg) scale(${s.toFixed(3)})`;
        c.style.opacity = String(Math.max(0, 1 - p * 1.6));
      }

      // Props bob gently and spring away from the pointer.
      const mx = ((st.tx + 1) / 2) * W;
      const my = ((st.ty + 1) / 2) * H;
      PROPS.forEach((pr, i) => {
        const img = props.current[i];
        const at = phone ? pr.m : pr.at;
        if (!img || !at) return;
        const k = kick[i];
        const cx = (at.x / 100) * W + k.x;
        const cy = (at.y / 100) * H + k.y;
        const dist = Math.hypot(cx - mx, cy - my);
        if (!still && pointerIn && dist < 140) {
          const push = (1 - dist / 140) * 900 * dt;
          k.vx += ((cx - mx) / (dist || 1)) * push;
          k.vy += ((cy - my) / (dist || 1)) * push;
        }
        k.vx += -k.x * 60 * dt;
        k.vy += -k.y * 60 * dt;
        k.vx *= Math.exp(-dt * 6);
        k.vy *= Math.exp(-dt * 6);
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        const bob = still ? 0 : Math.sin(now / 1000 * 0.9 + i * 1.3) * 10;
        const x = k.x - st.px * 22 * pr.d;
        const y = k.y + bob - st.py * 16 * pr.d - p * 220 * pr.d;
        img.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${(k.vx * 0.04 + Math.sin(now / 1400 + i) * (still ? 0 : 4)).toFixed(2)}deg)`;
        img.style.opacity = String(Math.max(0, 1 - p * 1.5));
      });

      // The plane: a whimsical loop through the depth planes.
      const pl = plane.current;
      if (pl) {
        if (!still) flight += dt * (Math.PI * 2) / 26;
        const th = flight;
        // Reduced motion: parked in open sky, clear of the words and the postcards.
        const x = still ? W * (phone ? 0.5 : 0.59) : W * (0.5 + 0.46 * Math.sin(th));
        const y = still ? H * (phone ? 0.31 : 0.27) : H * ((phone ? 0.36 : 0.28) + (phone ? 0.04 : 0.12) * Math.sin(2 * th) - 0.03 * Math.cos(th));
        const depth = Math.cos(th); // 1 in front, -1 behind
        const vx = Math.cos(th);
        const vy = 2 * (phone ? 0.04 : 0.12) * Math.cos(2 * th) * (H / W) + 0.03 * Math.sin(th) * (H / W);
        const ang = Math.max(-24, Math.min(24, (Math.atan2(vy, Math.abs(vx) * 0.92) * 180) / Math.PI));
        const sc = (phone ? 0.62 : 0.78) + 0.3 * depth;
        const face = vx >= 0 ? 1 : -1;
        pl.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${(y - p * 200).toFixed(1)}px, 0) scale(${(sc * face).toFixed(3)}, ${sc.toFixed(3)}) rotate(${(ang * face).toFixed(2)}deg)`;
        pl.style.zIndex = depth > 0.2 ? '30' : '6';
        pl.style.opacity = String(Math.max(0, 1 - p * 1.4));
        if (!still) {
          trail.unshift({ x: x - face * 46 * sc, y: y + 8 * sc - p * 200 });
          if (trail.length > PUFFS * 3) trail.length = PUFFS * 3;
        }
        puffs.current.forEach((pf, k) => {
          const pt = trail[k * 3];
          if (!pf) return;
          if (!pt) {
            pf.style.opacity = '0';
            return;
          }
          const age = k / PUFFS;
          pf.style.transform = `translate(-50%, -50%) translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0) scale(${(0.35 + age * 1.1).toFixed(3)})`;
          pf.style.opacity = String(((1 - age) * 0.55 * Math.max(0, 1 - p * 1.4)).toFixed(3));
          pf.style.zIndex = pl.style.zIndex;
        });
      }

      if (visible) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        const r = el.getBoundingClientRect();
        st.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
        st.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
        pointerIn = true;
      }
      if (st.drag) {
        const dx = e.clientX - st.lastX;
        st.lastX = e.clientX;
        st.dx = Math.max(-220, Math.min(220, st.dx + dx * 0.8));
        st.dv = dx / 0.016;
        dragged.current = Math.max(dragged.current, Math.abs(e.clientX - st.downX));
      }
    };
    const onDown = (e: PointerEvent) => {
      st.drag = true;
      st.lastX = e.clientX;
      st.downX = e.clientX;
      dragged.current = 0;
    };
    const onUp = () => {
      st.drag = false;
      st.dv = Math.max(-1600, Math.min(1600, st.dv));
    };
    const onLeave = () => {
      st.tx = 0;
      st.ty = 0;
      pointerIn = false;
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(el);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(frame);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [scrollYProgress]);

  const enter = (i: number) => {
    hover.current = i;
    if (root.current) root.current.dataset.tone = POSTCARDS[i].tone;
  };
  const leave = (i: number) => {
    if (hover.current === i) hover.current = null;
    if (root.current) root.current.dataset.tone = '';
  };

  return (
    <section ref={root} className="hero-portal relative isolate overflow-hidden" aria-labelledby="hero-title" data-tone="">
      {/* Sunlit stage: real scenes under a warm wash, bloom and grain */}
      <div aria-hidden className="portal-scenes absolute inset-0 -z-30">
        <div className="portal-scene">
          <LiveMedia clip={{ ...HERO_CLIP, alt: '' }} className="absolute inset-0" eager />
        </div>
        {SCENES.map((id) => (
          <div key={id} className="portal-scene">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pexels(id, 1600)} alt="" loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
      <div aria-hidden className="portal-wash absolute inset-0 -z-20" />
      <div aria-hidden className="portal-glows absolute inset-0 -z-10">
        {TONES.map((t) => (
          <span key={t} className={`portal-glow glow-${t}`} />
        ))}
      </div>
      <div aria-hidden className="portal-bloom absolute inset-0 -z-10" />
      <div aria-hidden className="portal-grain absolute inset-0 -z-10" />

      {/* Three depth planes of postcards */}
      <div className="portal-stage absolute inset-0">
        {POSTCARDS.map((pc, i) => {
          const label = `${pc.spot}, ${names[pc.slug] ?? pc.slug}`;
          return (
            <button
              key={pc.key}
              ref={(n) => {
                cards.current[i] = n;
              }}
              type="button"
              className={`postcard plane-${pc.plane} is-${pc.shape} ${pc.m ? '' : 'no-phone'}`}
              style={
                {
                  '--x': `${pc.at.x}%`,
                  '--y': `${pc.at.y}%`,
                  '--mx': pc.m ? `${pc.m.x}%` : undefined,
                  '--my': pc.m ? `${pc.m.y}%` : undefined,
                  transform: `translate(-50%, -50%) rotate(${pc.r}deg)`,
                } as React.CSSProperties
              }
              aria-label={`${label}. Show it on the globe`}
              onPointerEnter={(e) => e.pointerType === 'mouse' && enter(i)}
              onPointerLeave={() => leave(i)}
              onFocus={() => enter(i)}
              onBlur={() => leave(i)}
              onClick={(e) => {
                if (dragged.current > 8) {
                  e.preventDefault();
                  return;
                }
                onPick(pc.slug);
              }}
            >
              <span className="postcard-photo">
                {pc.clip ? (
                  <LiveMedia clip={COUNTRY_CLIPS[pc.clip]} className="absolute inset-0" eager />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pexels(pc.photo!, pc.plane === 'near' ? 640 : 420)} alt={pc.alt} loading={pc.plane === 'far' ? 'lazy' : 'eager'} decoding="async" draggable={false} />
                )}
              </span>
              <span className="postcard-pill" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={flagSrc(pc.slug)} alt="" width={16} height={16} />
                {label}
              </span>
            </button>
          );
        })}

        {PROPS.map((pr, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={pr.cls}
            ref={(n) => {
              props.current[i] = n;
            }}
            src={pr.src}
            alt=""
            aria-hidden
            draggable={false}
            className={`portal-prop ${pr.cls} ${pr.m ? '' : 'no-phone'}`}
            style={{ '--x': `${pr.at.x}%`, '--y': `${pr.at.y}%`, '--mx': pr.m ? `${pr.m.x}%` : undefined, '--my': pr.m ? `${pr.m.y}%` : undefined } as React.CSSProperties}
          />
        ))}

        {Array.from({ length: PUFFS }, (_, k) => (
          <span
            key={k}
            aria-hidden
            className="portal-puff"
            ref={(n) => {
              puffs.current[k] = n;
            }}
          />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={plane} src="/hero3d/plane.webp" alt="" aria-hidden draggable={false} className="portal-plane" />
      </div>

      {/* The words */}
      <motion.div style={{ y: copyY, opacity: copyOpacity }} className="portal-copy pointer-events-none relative z-20 mx-auto flex flex-col items-center justify-center px-5 text-center">
        <h1 id="hero-title" className="portal-title">
          {headline}
        </h1>
        <p className="portal-tagline">{tagline}</p>
      </motion.div>

      {/* Into the atlas */}
      <motion.div aria-hidden style={{ opacity: veil }} className="portal-veil pointer-events-none absolute inset-0 z-40" />
      <div aria-hidden className="portal-foot pointer-events-none absolute inset-x-0 bottom-0 z-40" />
      <div aria-hidden className="portal-cue pointer-events-none absolute bottom-5 left-1/2 z-40">
        <span className="portal-cue-dot" />
      </div>
    </section>
  );
}
