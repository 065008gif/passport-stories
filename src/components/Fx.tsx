'use client';

/**
 * Motion helpers shared by the inner pages.
 *
 *  RevealRoot      put once in the layout. Any element with data-rv="up|left|
 *                  right|pop" fades/slides in when it scrolls into view.
 *                  Optional stagger: style={{ '--d': '120ms' }}.
 *  CountUp         "39 hrs/week" counts up from 0 the first time it is seen.
 *  Tilt            a card that leans toward the pointer.
 *  ScrollPlane     thin progress line with a paper plane, top of inner pages.
 */
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function RevealRoot() {
  const pathname = usePathname();
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('rv-in');
            io.unobserve(en.target);
          }
        }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const scan = (root: ParentNode) => root.querySelectorAll?.('[data-rv]:not(.rv-in)').forEach((el) => io.observe(el));
    scan(document);
    // Content that appears later (filters, reveals) gets picked up too.
    const mo = new MutationObserver((muts) =>
      muts.forEach((m) =>
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return;
          const el = n as Element;
          if (el.matches?.('[data-rv]:not(.rv-in)')) io.observe(el);
          scan(el);
        }),
      ),
    );
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);
  return null;
}

/** Counts the first number in `text` up from zero when it scrolls into view. */
export function CountUp({ text, className, duration = 900, play = true }: { text: string; className?: string; duration?: number; play?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);
  useEffect(() => {
    const m = text.match(/\d[\d,]*(\.\d+)?/);
    if (!m || text.includes(':') || !play) return setShown(text);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setShown(text);
    const target = parseFloat(m[0].replace(/,/g, ''));
    const decimals = m[1] ? m[1].length - 1 : 0;
    const before = text.slice(0, m.index);
    const after = text.slice((m.index || 0) + m[0].length);
    const fmt = (n: number) => before + (decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-IN')) + after;
    setShown(fmt(0));
    let raf = 0;
    const io = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / duration);
          setShown(fmt(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(step);
          else setShown(text);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    if (ref.current) io.observe(ref.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [text, duration, play]);
  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {shown}
    </span>
  );
}

/** Leans toward the pointer. Does nothing on touch screens. */
export function Tilt({ children, className = '', max = 9 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty('--ry', `${x * max}deg`);
    ref.current.style.setProperty('--rx', `${-y * max}deg`);
    ref.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const leave = () => {
    ref.current?.style.setProperty('--ry', '0deg');
    ref.current?.style.setProperty('--rx', '0deg');
  };
  return (
    <div ref={ref} className={`tilt ${className}`} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </div>
  );
}

/** Reading progress for inner pages: a line that a paper plane flies along. */
export function ScrollPlane() {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (pathname === '/') return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const p = total > 0 ? Math.min(1, window.scrollY / total) : 0;
      bar.current?.style.setProperty('--p', String(p));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);
  if (pathname === '/') return null;
  return (
    <div ref={bar} aria-hidden className="scroll-plane">
      <span className="scroll-plane-fill" />
      <svg className="scroll-plane-icon" viewBox="0 0 24 24">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.670 10 3.500V9l-8 5v2l8-2.500V19l-2 1.500V22l3.500-1 3.500 1v-1.500L13 19v-5.500l8 2.500z" fill="#FFF4E0" stroke="#1B1F5E" strokeWidth="0.9" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
