'use client';

/**
 * A live background: the poster photo shows at once, the video fades in and
 * plays only while it is on screen. Photos without video drift slowly (Ken
 * Burns). Reduced motion or data-saver: poster only.
 */
import { useEffect, useRef, useState } from 'react';
import type { Clip } from '@/data/media';

export default function LiveMedia({ clip, className = '', eager = false }: { clip: Clip; className?: string; eager?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [useVideo, setUseVideo] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!clip.video) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (reduce || conn?.saveData || /2g/.test(conn?.effectiveType || '')) return;
    setUseVideo(true);
  }, [clip.video]);

  useEffect(() => {
    const el = box.current;
    const v = vid.current;
    if (!el || !v || !useVideo) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          if (!v.src) v.src = clip.video!;
          v.play().catch(() => {});
        } else v.pause();
      },
      { rootMargin: eager ? '0px' : '200px 0px', threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [useVideo, clip.video, eager]);

  return (
    <div ref={box} className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={clip.poster} alt={clip.alt} className={`absolute inset-0 h-full w-full object-cover ${clip.video ? '' : 'kenburns'}`} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" />
      {useVideo && (
        <video
          ref={vid}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${playing ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
    </div>
  );
}
