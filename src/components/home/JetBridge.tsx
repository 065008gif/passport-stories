'use client';

/**
 * The seam bridge: one jet that pops out of the hero, glides with the scroll
 * and lands on the globe.
 *
 * seamP runs from 0 (the hero at 84%) to 1 (the globe canvas centred at 52%
 * of the viewport), measured from the live page every frame. It is eased
 * lightly (0.14 a frame) and drives a transparent canvas portalled onto
 * document.body, fixed over the whole viewport, under the header and above
 * both sections. The canvas never takes the pointer.
 *
 * Ownership (see jetSeam.ts): hero at 0, bridge in between, globe at 1. The
 * loop sleeps and the canvas hides whenever the bridge does not own the jet.
 * Reduced motion skips the bridge: hero before the seam, globe after it.
 *
 * Landing: the globe takes the jet at seamP 1, or as soon as scrolling stops
 * with the globe in view (the bridge finishes its own touchdown path over
 * ~0.6s). Once landed the globe keeps the jet until the visitor scrolls clearly
 * back up; the bridge then lifts off from wherever the globe jet is.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { jetSeam, type JetOwner } from '@/components/home/jetSeam';
import type { JetBridgeScene } from '@/components/home/jetBridgeScene';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export default function JetBridge() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const cv = useRef<HTMLCanvasElement>(null);

  useEffect(() => setHost(document.body), []);

  useEffect(() => {
    const canvas = cv.current;
    if (!host || !canvas) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scene: JetBridgeScene | null = null;
    let disposed = false;
    let raf = 0;
    let last = performance.now();
    let t = -1;
    let shown = false;
    const geo = { start: 0, end: 1, p: 0 };
    let landed = false;
    let landedAt = 1;
    let lastScroll = 0;

    /** The seam window, from the live page. */
    const seam = () => {
      const sec = document.querySelector<HTMLElement>('section[aria-labelledby="hero-title"]');
      const st = sec?.querySelector<HTMLElement>('.hero-stage');
      const globe = document.querySelector<HTMLElement>('.observatory');
      if (!sec || !st || !globe) return 0;
      const y = window.scrollY;
      const top = sec.getBoundingClientRect().top + y - (parseFloat(getComputedStyle(st).top) || 0);
      const runway = Math.max(1, sec.offsetHeight - st.offsetHeight);
      const g = globe.getBoundingClientRect();
      geo.start = top + runway * 0.84;
      geo.end = Math.max(geo.start + 1, g.top + y + g.height / 2 - window.innerHeight * 0.52);
      geo.p = clamp01((y - geo.start) / Math.max(1, geo.end - geo.start));
      return geo.p;
    };
    const headerH = () => document.querySelector('header')?.getBoundingClientRect().height ?? 72;

    const show = (on: boolean) => {
      if (on === shown) return;
      shown = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
      if (!on) scene?.reset();
    };

    const tick = (now: number) => {
      raf = 0;
      if (disposed) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const p = seam();
      if (reduce) {
        jetSeam.set(p <= 0 ? 'hero' : 'globe');
        show(false);
        return;
      }
      // landed: the globe keeps the jet until the visitor scrolls clearly back up
      if (landed && p < Math.min(landedAt, 1) - 0.08) {
        landed = false;
        t = 0.985; // lift off from the globe jet's own spot, then follow the scroll back
      }
      if (landed) {
        t = 1;
      } else if (t < 0) t = p;
      else {
        // settle to land: scrolling has stopped with the globe in view, so finish the touchdown
        const g = document.querySelector('.observatory')?.getBoundingClientRect();
        const settle = shown && now - lastScroll > 240 && p >= 0.5 && !!g && g.top < window.innerHeight * 0.6 && g.bottom > window.innerHeight * 0.5;
        const goal = settle ? 1 : p;
        const k = settle ? 1 - Math.exp(-dt * 5) : 1 - Math.pow(1 - 0.14, dt * 60);
        t += (goal - t) * k;
        if (Math.abs(goal - t) < 0.0015) t = goal;
      }
      if (!landed && t >= 0.99) {
        landed = true;
        landedAt = p;
      }
      let owner: JetOwner = landed ? 'globe' : t <= 0.0005 ? 'hero' : 'bridge';
      const s = jetSeam.hero?.() ?? null;
      const e = jetSeam.globe?.() ?? null;
      // never zero jets: if the bridge cannot draw yet, the nearer side keeps the jet
      if (owner === 'bridge' && (!scene || !s)) owner = t < 0.5 ? 'hero' : 'globe';
      jetSeam.set(owner);
      if (owner === 'bridge' && scene && s) {
        const target = e ?? { x: window.innerWidth * 0.5, y: window.innerHeight - 72, span: s.span * 0.6, angle: -Math.PI / 2 };
        scene.render(t, s, target, headerH(), shown ? dt : 0);
        show(true);
      } else show(false);
      if (owner === 'bridge' || (!landed && t !== p)) raf = requestAnimationFrame(tick);
    };
    const onScroll = () => {
      lastScroll = performance.now();
      wake();
    };
    const wake = () => {
      if (raf || disposed) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const resize = () => {
      scene?.resize(canvas.clientWidth, canvas.clientHeight);
      wake();
    };

    import('@/components/home/jetBridgeScene')
      .then((mod) => {
        if (disposed) return;
        if (!reduce) {
          try {
            scene = new mod.JetBridgeScene(canvas);
            scene.resize(canvas.clientWidth, canvas.clientHeight);
          } catch {
            scene = null; // no WebGL: the hero and the globe hand over directly
          }
        }
        wake();
      })
      .catch(() => wake());

    // test hook: the seam window and who owns the jet
    (window as unknown as { __seam?: () => unknown }).__seam = () => ({ start: Math.round(geo.start), end: Math.round(geo.end), p: +geo.p.toFixed(3), t: +t.toFixed(3), owner: jetSeam.owner, bridge: shown, landed });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    wake();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      scene?.dispose();
      scene = null;
    };
  }, [host]);

  if (!host) return null;
  return createPortal(
    <canvas
      ref={cv}
      aria-hidden
      className="jet-bridge"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 45, visibility: 'hidden' }}
    />,
    host,
  );
}
