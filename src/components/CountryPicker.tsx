'use client';

/**
 * A country chooser that replaces the plain browser dropdown: a button that
 * opens a searchable board of round flags. On phones it rises as a sheet.
 *
 * Keyboard: type to filter, arrow keys move, Enter picks, Esc closes.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { flagSrc } from '@/components/Flag';
import { track } from '@/lib/analytics';

export interface PickOption {
  slug: string;
  name: string;
  airport?: string;
}

export default function CountryPicker({
  label,
  options,
  value,
  disabled = [],
  onChange,
  tone = 'dark',
  name = 'country',
}: {
  label: string;
  options: PickOption[];
  value: string;
  disabled?: string[];
  onChange: (slug: string) => void;
  tone?: 'dark' | 'light';
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cursor, setCursor] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const current = options.find((o) => o.slug === value) || options[0];

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? options.filter((o) => o.name.toLowerCase().includes(n) || o.airport?.toLowerCase().includes(n)) : options;
  }, [options, q]);

  useEffect(() => {
    if (!open) return;
    setQ('');
    setCursor(Math.max(0, options.findIndex((o) => o.slug === value)));
    const t = window.setTimeout(() => input.current?.focus(), 60);
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('pointerdown', away);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (slug: string, how = 'click') => {
    if (disabled.includes(slug)) return;
    setOpen(false);
    track('picker_used', { picker: name, country: slug, how });
    if (slug !== value) onChange(slug);
  };
  const lucky = () => {
    const pool = options.filter((o) => o.slug !== value && !disabled.includes(o.slug));
    choose(pool[Math.floor(Math.random() * pool.length)].slug, 'random');
  };

  const onKey = (e: React.KeyboardEvent) => {
    const cols = window.innerWidth < 640 ? 4 : 5;
    const move = (d: number) => {
      e.preventDefault();
      setCursor((c) => Math.max(0, Math.min(shown.length - 1, c + d)));
    };
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowRight') move(1);
    else if (e.key === 'ArrowLeft') move(-1);
    else if (e.key === 'ArrowDown') move(cols);
    else if (e.key === 'ArrowUp') move(-cols);
    else if (e.key === 'Enter' && shown[cursor]) {
      e.preventDefault();
      choose(shown[cursor].slug, 'keyboard');
    }
  };

  const dark = tone === 'dark';
  return (
    <div ref={root} className="relative min-w-0 flex-1">
      <span className={`kicker mb-1 block ${dark ? 'text-cream/80' : 'text-ink/70'}`}>{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        data-track={`picker-open:${name}`}
        className={`group flex h-14 w-full items-center gap-3 rounded-2xl border-2 pl-2 pr-4 text-left text-lg font-bold transition-all ${
          dark ? 'border-cream/30 bg-night text-cream hover:border-sun' : 'border-ink/25 bg-white/70 text-ink hover:border-ink'
        } ${open ? (dark ? '!border-sun' : '!border-ink') : ''}`}
      >
        <motion.img key={current.slug} src={flagSrc(current.slug)} alt="" width={40} height={40} initial={{ scale: 0.4, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 16 }} className="h-10 w-10 rounded-full object-cover ring-2 ring-cream/80" />
        <span className="min-w-0 flex-1 truncate">{current.name}</span>
        <span aria-hidden className={`text-sm transition-transform duration-200 ${open ? 'rotate-180' : 'group-hover:translate-y-0.5'}`}>
          ▼
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-[80] bg-night/70 sm:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 520, damping: 34 }}
              onKeyDown={onKey}
              className="fixed inset-x-0 bottom-0 z-[90] max-h-[78svh] overflow-auto rounded-t-3xl border-2 border-sun bg-panel p-4 shadow-ticket sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:max-h-none sm:w-[440px] sm:rounded-3xl"
            >
              <div className="flex items-center gap-2">
                <input
                  ref={input}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setCursor(0);
                  }}
                  placeholder="Type a country…"
                  aria-label={`Search ${label}`}
                  className="h-11 min-w-0 flex-1 rounded-full border-2 border-cream/25 bg-night px-4 text-base font-semibold text-cream placeholder:font-normal placeholder:text-cream/45 focus:border-sun"
                />
                <button type="button" onClick={lucky} className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-sun px-4 text-sm font-extrabold text-ink transition-transform hover:rotate-3 hover:scale-105 active:scale-95">
                  <span aria-hidden>🎲</span> Surprise
                </button>
              </div>
              <ul id={id} role="listbox" aria-label={label} className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-5">
                {shown.map((o, i) => (
                  <motion.li key={o.slug} role="presentation" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.012, type: 'spring', stiffness: 500, damping: 24 }}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={o.slug === value}
                      disabled={disabled.includes(o.slug)}
                      onClick={() => choose(o.slug)}
                      onMouseEnter={() => setCursor(i)}
                      className={`pick-flag w-full ${i === cursor ? 'ring-2 ring-sky' : ''}`}
                      title={disabled.includes(o.slug) ? `${o.name} is already on the other side` : o.name}
                    >
                      <img src={flagSrc(o.slug)} alt="" width={44} height={44} className="h-11 w-11 rounded-full object-cover ring-2 ring-cream/80" />
                      {o.name}
                    </button>
                  </motion.li>
                ))}
              </ul>
              {shown.length === 0 && <p className="py-6 text-center text-cream/80">No country by that name yet.</p>}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
