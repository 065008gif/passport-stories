'use client';

/**
 * Everything that measures the visit lives here.
 *
 *  - Loads Google Analytics 4 when NEXT_PUBLIC_GA_ID is set.
 *  - Loads Microsoft Clarity (heatmaps + session recordings) when
 *    NEXT_PUBLIC_CLARITY_ID is set.
 *  - Sends a page_view on every route change.
 *  - Automatic tracking, no per-button code needed:
 *      ui_click      every link and button pressed
 *      scroll_depth  25 / 50 / 75 / 100 % of each page
 *      page_time     seconds the page was actually on screen
 *      section_view  each named section that is scrolled into view
 *  - Add ?debug=1 to any URL to see events appear live on screen.
 */
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { CLARITY_ID, GA_ID, captureUtm, pageview, track } from '@/lib/analytics';

const label = (el: Element) =>
  (el.getAttribute('data-track') || el.getAttribute('aria-label') || (el.textContent || '').replace(/\s+/g, ' ').trim() || el.tagName).slice(0, 60);

function useAutoTrack(pathname: string) {
  // Clicks: one listener for the whole site.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.('a, button, [data-track]');
      if (!el) return;
      const href = el.getAttribute('href') || undefined;
      const section = el.closest('[data-section], section[id], [data-topic]');
      track('ui_click', {
        label: label(el),
        element: el.tagName.toLowerCase(),
        href,
        section: section?.getAttribute('data-section') || section?.getAttribute('data-topic') || section?.id || undefined,
        page_path: window.location.pathname,
      });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Scroll depth, time on page and section views: reset on every page.
  useEffect(() => {
    const sent = new Set<number>();
    let visibleSince = document.visibilityState === 'visible' ? performance.now() : 0;
    let visibleMs = 0;
    let maxDepth = 0;

    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - window.innerHeight;
      const pct = total <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / total) * 100));
      maxDepth = Math.max(maxDepth, pct);
      [25, 50, 75, 100].forEach((mark) => {
        if (pct >= mark && !sent.has(mark)) {
          sent.add(mark);
          track('scroll_depth', { percent: mark, page_path: pathname });
        }
      });
    };
    const pause = () => {
      if (visibleSince) visibleMs += performance.now() - visibleSince;
      visibleSince = 0;
    };
    let flushed = false;
    const flush = () => {
      if (flushed) return;
      flushed = true;
      pause();
      const seconds = Math.round(visibleMs / 1000);
      if (seconds >= 1) track('page_time', { seconds, max_scroll_percent: maxDepth, page_path: pathname, transport_type: 'beacon' });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pause();
      else visibleSince = performance.now();
    };
    // Shortly after paint so short pages still report 100 %.
    const first = window.setTimeout(onScroll, 1500);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);

    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          const name = (en.target as HTMLElement).dataset.section;
          if (en.isIntersecting && name && !seen.has(name)) {
            seen.add(name);
            track('section_view', { section: name, page_path: pathname });
          }
        }),
      { threshold: 0.35 },
    );
    const scan = window.setTimeout(() => document.querySelectorAll('[data-section]').forEach((el) => io.observe(el)), 400);

    return () => {
      flush();
      window.clearTimeout(first);
      window.clearTimeout(scan);
      io.disconnect();
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, [pathname]);
}

interface Logged {
  event: string;
  payload: Record<string, unknown>;
  at: number;
}

/** Live event log. Turn on with ?debug=1, off with ?debug=0. */
function DebugPanel() {
  const [on, setOn] = useState(false);
  const [rows, setRows] = useState<Logged[]>([]);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('debug');
    try {
      if (q === '1') localStorage.setItem('ps_debug', '1');
      if (q === '0') localStorage.removeItem('ps_debug');
      setOn(localStorage.getItem('ps_debug') === '1');
    } catch {
      setOn(q === '1');
    }
    const add = (e: Event) => setRows((r) => [(e as CustomEvent<Logged>).detail, ...r].slice(0, 40));
    window.addEventListener('ps:analytics', add);
    return () => window.removeEventListener('ps:analytics', add);
  }, []);
  if (!on) return null;
  return (
    <aside className="fixed bottom-3 left-3 z-[200] max-h-[45vh] w-[min(92vw,360px)] overflow-auto rounded-2xl border border-sky/50 bg-night/95 p-3 font-mono text-[11px] text-cream shadow-ticket" aria-label="Analytics event log">
      <p className="mb-2 flex items-center justify-between font-semibold text-sky">
        Live events ({rows.length}) · {GA_ID ? 'sending to GA4' : 'GA4 not connected'}
        <a href="?debug=0" className="underline">
          close
        </a>
      </p>
      <ol className="space-y-1.5">
        {rows.map((r, i) => (
          <li key={`${r.at}-${i}`} className="rounded-lg bg-white/5 p-1.5">
            <span className="font-semibold text-sun">{r.event}</span>{' '}
            <span className="break-words text-cream/75">
              {Object.entries(r.payload)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => `${k}=${v}`)
                .join(' · ')}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export default function Analytics() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    captureUtm();
  }, []);

  useEffect(() => {
    pageview(pathname);
    first.current = false;
  }, [pathname]);

  useAutoTrack(pathname);

  return (
    <>
      {GA_ID && <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />}
      {/* lazyOnload: Clarity loads only after the page has fully loaded and the browser is idle, so it never slows the first view. */}
      {CLARITY_ID && (
        <Script id="clarity" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      )}
      <DebugPanel />
    </>
  );
}
