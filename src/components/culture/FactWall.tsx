'use client';

/** Did You Know? wall: filter by topic or country, or let Pia pick one at random. */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import Flag from '@/components/Flag';
import { track } from '@/lib/analytics';
import type { FactCategory } from '@/data/culture';
import type { Source } from '@/data/types';

export interface WallFact {
  title: string;
  text: string;
  category: FactCategory;
  country: string;
  countryName: string;
  source: Source;
}

const CATS: (FactCategory | 'All')[] = ['All', 'Traditions', 'Food', 'School & work', 'Celebrations', 'Everyday life'];
const TONE: Record<FactCategory, string> = {
  Traditions: '#6C4CF5',
  Food: '#FFB703',
  'School & work': '#06A77D',
  Celebrations: '#FF4F7B',
  'Everyday life': '#FF7A1A',
};

export default function FactWall({ facts }: { facts: WallFact[] }) {
  const [cat, setCat] = useState<FactCategory | 'All'>('All');
  const [country, setCountry] = useState<string>('all');
  const [lucky, setLucky] = useState<WallFact | null>(null);
  const countries = useMemo(() => Array.from(new Map(facts.map((f) => [f.country, f.countryName])).entries()), [facts]);
  const shown = facts.filter((f) => (cat === 'All' || f.category === cat) && (country === 'all' || f.country === country));

  const surprise = () => {
    const pick = facts[Math.floor(Math.random() * facts.length)];
    setLucky(pick);
    track('fact_surprise', { country: pick.country });
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {CATS.map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c} className="chip">
            {c !== 'All' && <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[c] }} />}
            {c}
          </button>
        ))}
        <button onClick={surprise} className="btn btn-sun ml-auto">
          <span aria-hidden>🎲</span> Surprise me
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Country">
        <button onClick={() => setCountry('all')} aria-pressed={country === 'all'} className="chip">
          Every country
        </button>
        {countries.map(([slug, name]) => (
          <button key={slug} onClick={() => setCountry(slug)} aria-pressed={country === slug} className="chip">
            <Flag slug={slug} size={20} /> {name}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {lucky && (
          <motion.div initial={{ opacity: 0, y: -10, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={{ opacity: 0 }} className="mt-6 rounded-3xl bg-sky p-6 sm:p-8" aria-live="polite">
            <p className="kicker text-sun">
              Pia&apos;s pick · {lucky.countryName} · {lucky.category}
            </p>
            <h2 className="h-display mt-2 text-3xl sm:text-4xl">{lucky.title}</h2>
            <p className="mt-2 max-w-3xl text-lg leading-relaxed">{lucky.text}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={surprise} className="btn btn-sun">
                Another one 🎲
              </button>
              <Link href={`/countries/${lucky.country}#culture`} className="btn border-2 border-white/60 text-white hover:bg-white/10">
                More about {lucky.countryName} →
              </Link>
              {lucky.source.url && (
                <a href={lucky.source.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold underline underline-offset-2">
                  Source: {lucky.source.label} ↗
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ul className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {shown.map((f) => (
          <li key={f.country + f.title} className="mb-4 break-inside-avoid rounded-3xl border-2 border-ink bg-paper p-5 text-ink shadow-[0_6px_0_#24123D] transition-transform hover:-translate-y-1">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink/60">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: TONE[f.category] }} />
              {f.category}
              <span className="ml-auto flex items-center gap-1.5 normal-case tracking-normal">
                <Flag slug={f.country} size={18} /> {f.countryName}
              </span>
            </p>
            <h3 className="h-display mt-2 text-2xl">{f.title}</h3>
            <p className="mt-2 leading-relaxed text-ink/85">{f.text}</p>
            {f.source.url ? (
              <a href={f.source.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs font-semibold text-ink/55 underline decoration-dotted underline-offset-2 hover:text-coral">
                Source: {f.source.label} ↗
              </a>
            ) : (
              <span className="mt-3 inline-block text-xs text-ink/55">Source: {f.source.label}</span>
            )}
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-8 text-cream/75">Nothing here yet. Try another topic or country.</p>}
    </div>
  );
}
