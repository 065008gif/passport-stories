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
      // light damping: silky, never far behind the scroll
      if (t < 0) t = p;
      else {
        t += (p - t) * (1 - Math.pow(1 - 0.14, dt * 60));
        if (Math.abs(p - t) < 0.0015) t = p;
      }
      let owner: JetOwner = t <= 0.0005 ? 'hero' : t >= 0.99 ? 'globe' : 'bridge';
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
      if (owner === 'bridge' || t !== p) raf = requestAnimationFrame(tick);
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
    (window as unknown as { __seam?: () => unknown }).__seam = () => ({ start: Math.round(geo.start), end: Math.round(geo.end), p: +geo.p.toFixed(3), t: +t.toFixed(3), owner: jetSeam.owner, bridge: shown });

    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', resize);
    wake();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', wake);
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
