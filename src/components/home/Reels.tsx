'use client';

/**
 * Latest Reels: the newest Instagram posts and reels, filled in automatically
 * from /api/instagram (cached for an hour). Loads only when the section is
 * close to the screen, so it never slows the home page down.
 */
import { useEffect, useRef, useState } from 'react';
import { site } from '@/data/site';
import { track, withUtm } from '@/lib/analytics';
import type { InstaPost } from '@/lib/server/instagram';

export function InstagramLogo({ className = '', color = 'currentColor' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth="2.2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.1" fill={color} stroke="none" />
    </svg>
  );
}

export function YouTubeLogo({ className = '', body = 'currentColor', play = '#fff' }: { className?: string; body?: string; play?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill={body} />
      <path d="M10 8.8v6.4l5.6-3.2z" fill={play} />
    </svg>
  );
}

const IG_GRADIENT = 'linear-gradient(45deg,#feda75 0%,#fa7e1e 30%,#d62976 60%,#962fbf 80%,#4f5bd5 100%)';

/** The two buttons above the carousel: cream stickers with the real logos. */
export function SocialButtons() {
  const links = [
    { platform: 'instagram' as const, href: site.social.instagram, label: 'Instagram' },
    { platform: 'youtube' as const, href: site.social.youtube, label: 'YouTube' },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {links.map(({ platform, href, label }, i) => {
        const ig = platform === 'instagram';
        const cls = `social-btn bg-paper text-ink shadow-[0_5px_0_#FF8A4C] ${i ? 'rotate-[1.5deg]' : '-rotate-[1.5deg]'}`;
        const icon = ig ? (
          <span className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: IG_GRADIENT }}>
            <InstagramLogo className="h-5 w-5" color="#fff" />
          </span>
        ) : (
          <YouTubeLogo className="h-8 w-8" body="#ff0000" />
        );
        return (
          <a
            key={platform}
            href={withUtm(href, 'reels')}
            target="_blank"
            rel="noopener noreferrer"
            className={cls}
            onClick={() => track('outbound_social_click', { platform, placement: 'reels' })}
          >
            {icon}
            <span>{label}</span>
            <span aria-hidden className="social-arrow">↗</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        );
      })}
    </div>
  );
}

const TEASERS = ['A school day in Japan, start to finish', 'Three weddings, three continents', 'Who leaves work first?', 'How Amsterdam cycles to work', 'Where does dinner start early?'];

export default function Reels() {
  const box = useRef<HTMLElement>(null);
  const [posts, setPosts] = useState<InstaPost[] | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const load = () =>
      fetch('/api/instagram')
        .then((r) => (r.ok ? r.json() : { posts: [] }))
        .then((d: { posts: InstaPost[] }) => setPosts(d.posts || []))
        .catch(() => setPosts([]));
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          load();
        }
      },
      { rootMargin: '600px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={box} className="container-x py-16" aria-labelledby="reels-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-sun">In-flight entertainment · {site.social.handle}</p>
          <h2 id="reels-title" className="sign mt-2 text-3xl sm:text-5xl">
            Latest Reels
          </h2>
        </div>
        <SocialButtons />
      </div>

      <ul className="mt-8 flex snap-x gap-4 overflow-x-auto pb-4 sm:grid sm:grid-cols-4 sm:overflow-visible lg:grid-cols-5">
        {posts === null &&
          [0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="w-[62vw] max-w-[260px] shrink-0 sm:w-auto sm:max-w-none">
              <div className="aspect-[9/16] animate-pulse rounded-3xl border border-cream/10 bg-panel" />
            </li>
          ))}

        {posts &&
          posts.length > 0 &&
          posts.map((p) => (
            <li key={p.id} className="w-[62vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none">
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('outbound_social_click', { platform: 'instagram', placement: 'reels-post' })}
                className="group relative block aspect-[9/16] overflow-hidden rounded-3xl border-2 border-cream/15 bg-ink transition-transform duration-300 hover:-translate-y-2 hover:rotate-1 hover:border-sun"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/10 to-transparent" />
                <span className="kicker absolute left-3 top-3 rounded-full bg-night/75 px-2 py-1 text-cream">{p.kind === 'reel' ? 'Reel' : p.kind === 'carousel' ? 'Post · swipe' : 'Post'}</span>
                {p.kind === 'reel' && (
                  <span aria-hidden className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 text-xl text-ink transition-transform group-hover:scale-110">
                    ▶
                  </span>
                )}
                {p.caption && <p className="absolute inset-x-3 bottom-3 line-clamp-3 text-sm font-semibold leading-snug text-cream">{p.caption}</p>}
                <span className="sr-only"> (opens Instagram in a new tab)</span>
              </a>
            </li>
          ))}

        {posts &&
          posts.length === 0 &&
          TEASERS.map((title, i) => (
            <li key={title} className="w-[62vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none">
              <a
                href={withUtm(site.social.instagram, 'reels-teaser')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('outbound_social_click', { platform: 'instagram', placement: 'reels-teaser' })}
                className="sunset-sky relative flex aspect-[9/16] flex-col justify-between overflow-hidden rounded-3xl border-2 border-cream/15 p-4 transition-transform duration-300 hover:-translate-y-2 hover:rotate-1 hover:border-sun"
              >
                <span className="kicker self-start rounded-full bg-night/70 px-2 py-1 text-cream">Reel · {String(i + 1).padStart(2, '0')}</span>
                <span aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-paper text-ink">
                  <InstagramLogo className="h-8 w-8" />
                </span>
                <p className="rounded-xl bg-night/75 p-3 text-sm font-semibold leading-snug text-cream">
                  {title}
                  <span className="mt-1 block font-mono text-[10px] font-normal uppercase tracking-wider text-sun">Watch on Instagram ↗</span>
                </p>
              </a>
            </li>
          ))}
      </ul>
    </section>
  );
}
