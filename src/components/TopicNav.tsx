'use client';

/**
 * Sticky topic bar on a country page. The topic being read lights up, the
 * ones already passed get a tick, and a line shows how far down you are.
 */
import { useEffect, useRef, useState } from 'react';
import { TopicIcon } from './Visuals';
import type { TopicSlug } from '@/data/types';

export default function TopicNav({ topics }: { topics: { slug: TopicSlug; title: string; accent: string }[] }) {
  const [active, setActive] = useState(-1);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const els = topics.map((t) => document.getElementById(t.slug));
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.4;
      let idx = -1;
      els.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top <= line) idx = i;
      });
      setActive(idx);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [topics]);

  // Keep the active chip in view on narrow screens.
  useEffect(() => {
    const el = list.current?.children[active] as HTMLElement | undefined;
    if (el && list.current) list.current.scrollTo({ left: el.offsetLeft - 24, behavior: 'smooth' });
  }, [active]);

  return (
    <nav aria-label="Topics on this page" className="sticky top-[var(--header)] z-30 border-b border-cream/15 bg-night/90 backdrop-blur">
      <ul ref={list} className="container-x flex gap-1.5 overflow-x-auto py-2 text-cream">
        {topics.map((t, i) => {
          const on = i === active;
          const done = i < active;
          return (
            <li key={t.slug} className="shrink-0">
              <a
                href={`#${t.slug}`}
                aria-current={on ? 'true' : undefined}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition-all duration-200 ${on ? 'scale-105 !text-ink shadow-[0_3px_0_rgba(0,0,0,.4)]' : 'hover:bg-cream/10'} ${done ? 'text-cream/55' : ''}`}
                style={on ? { background: t.accent } : undefined}
              >
                {done ? <span aria-hidden className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-teal text-[11px] text-white">✓</span> : <TopicIcon topic={t.slug} size={18} />}
                {t.title}
              </a>
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="h-1 bg-cream/10">
        <div className="h-full bg-sun transition-all duration-300" style={{ width: `${(Math.max(0, active + 1) / topics.length) * 100}%` }} />
      </div>
    </nav>
  );
}
