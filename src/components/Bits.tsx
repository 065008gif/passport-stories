'use client';

/**
 * Small interactive pieces used across pages:
 * DidYouKnow, CountryVisit, TrackEvent, TeleportButton, ShareLink.
 */
import { useEffect, useState } from 'react';
import { type EventName, track } from '@/lib/analytics';
import { earnBadge, earnStamp, getPassport } from '@/lib/passport';
import { useBoard } from './FlightProvider';

/* ---------------------------- Did You Know? ---------------------------- */

export interface Fact {
  text: string;
  country?: string;
}

/** A surprising fact on a small card. Shuffles on tap. */
export function DidYouKnow({ facts, tone = 'sun' }: { facts: Fact[]; tone?: 'sun' | 'sky' }) {
  // Start on the first fact so server and browser render the same thing,
  // then jump to a random one once the page is interactive.
  const [i, setI] = useState(0);
  useEffect(() => setI(Math.floor(Math.random() * facts.length)), [facts.length]);
  const fact = facts[i % facts.length];
  if (!fact) return null;
  return (
    <aside className={`rounded-2xl p-5 text-ink sm:p-6 ${tone === 'sun' ? 'bg-sun' : 'bg-sky'}`} aria-label="Did you know?">
      <p className="kicker">Did you know?{fact.country ? ` · ${fact.country}` : ''}</p>
      <p className="mt-2 text-lg font-semibold leading-snug sm:text-xl" aria-live="polite">
        {fact.text}
      </p>
      {facts.length > 1 && (
        <button onClick={() => setI((n) => (n + 1) % facts.length)} className="mt-3 font-mono text-sm font-medium underline underline-offset-4">
          Another one →
        </button>
      )}
    </aside>
  );
}

/* --------------------------- Tracking helpers -------------------------- */

/** Put on a country page: records the view and awards the passport stamp. */
export function CountryVisit({ country }: { country: { slug: string; name: string; airport: string } }) {
  useEffect(() => {
    track('country_view', { country: country.slug });
    const t = window.setTimeout(() => earnStamp(country), 650);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country.slug]);
  return null;
}

/** Fires one analytics event when the page it sits on is opened. */
export function TrackEvent({ event, params, badge }: { event: EventName; params?: Record<string, string | number>; badge?: string }) {
  const key = JSON.stringify(params);
  useEffect(() => {
    track(event, params);
    if (badge) {
      const t = window.setTimeout(() => earnBadge(badge), 1200);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, key, badge]);
  return null;
}

/* ------------------------------ Teleport ------------------------------- */

export interface TeleportTarget {
  slug: string;
  name: string;
  airport: string;
}

/**
 * "Teleport me": jumps to a random country, preferring ones not yet stamped.
 * On the home page the globe listens for the `ps:teleport` event and spins
 * there first; elsewhere it goes straight to the boarding transition.
 */
export function TeleportButton({ countries, className = 'btn btn-ghost', label = 'Teleport me' }: { countries: TeleportTarget[]; className?: string; label?: string }) {
  const board = useBoard();
  const go = () => {
    const stamps = getPassport().stamps;
    const fresh = countries.filter((c) => !stamps[c.slug]);
    const pool = fresh.length ? fresh : countries;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    track('teleport_used', { country: pick.slug });
    const detail = { slug: pick.slug, handled: false };
    window.dispatchEvent(new CustomEvent('ps:teleport', { detail }));
    if (!detail.handled) board(`/countries/${pick.slug}`, { name: pick.name, code: pick.airport });
  };
  return (
    <button onClick={go} className={className}>
      <span aria-hidden>🎲</span> {label}
    </button>
  );
}

/* ------------------------------ Share link ----------------------------- */

/** Shares the current page with the phone's share sheet, or copies the link. */
export function ShareLink({ title, className = 'btn btn-ghost-ink' }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href.split('?')[0];
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* share sheet dismissed */
    }
  };
  return (
    <button onClick={share} className={className}>
      <span aria-hidden>🔗</span> {copied ? 'Link copied' : 'Share this'}
    </button>
  );
}

/* ------------------------------ Topic spy ------------------------------ */

/**
 * `topic_view` is sent when a topic section on a country page has actually
 * been read: once per topic per visit, when it reaches the middle of the screen.
 */
export function TopicSpy({ country }: { country: string }) {
  useEffect(() => {
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const topic = (entry.target as HTMLElement).dataset.topic;
          if (entry.isIntersecting && topic && !seen.has(topic)) {
            seen.add(topic);
            track('topic_view', { country, topic });
          }
        });
      },
      { rootMargin: '-40% 0px -40% 0px' },
    );
    document.querySelectorAll('[data-topic]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [country]);
  return null;
}

/* ------------------------------ Map toggle ----------------------------- */

/** Globe / Flat map switch on the last home screen. FlightHome listens for `ps:flat`. */
export function MapToggle() {
  const [flat, setFlat] = useState(false);
  const pick = (value: boolean) => {
    setFlat(value);
    window.dispatchEvent(new CustomEvent('ps:flat', { detail: value }));
    track('map_toggled', { view: value ? 'flat' : 'globe' });
  };
  return (
    <div role="group" aria-label="Map style" className="inline-flex rounded-full border-2 border-sun bg-night/85 p-1 shadow-[0_4px_0_rgba(0,0,0,.35)] backdrop-blur">
      {(
        [
          [false, 'Globe', 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM3 12h18M12 3c3 3.2 3 14.800 0 18M12 3c-3 3.2-3 14.800 0 18'],
          [true, 'Flat map', 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14'],
        ] as const
      ).map(([value, label, d]) => (
        <button key={label} type="button" aria-pressed={flat === value} onClick={() => pick(value)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-extrabold transition-colors ${flat === value ? 'bg-sun text-ink' : 'text-cream hover:text-sun'}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d={d} />
          </svg>
          {label}
        </button>
      ))}
    </div>
  );
}
