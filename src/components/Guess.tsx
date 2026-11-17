'use client';

/**
 * "Guess first" cards. Instead of handing over a number, the page asks which
 * of two countries is higher; the answer and bars appear after the tap.
 * A small running score per page lives in `GuessScore`.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { flagSrc } from '@/components/Flag';
import { CountUp } from '@/components/Fx';
import { track } from '@/lib/analytics';
import { earnBadge } from '@/lib/passport';

export interface GuessSide {
  slug: string;
  name: string;
  value: number;
  display: string;
  isSample?: boolean;
}

/* Score shared by every guess card on the current page. */
let score = { right: 0, played: 0 };
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};
const SERVER = { right: 0, played: 0 };
export const resetScore = () => {
  score = { right: 0, played: 0 };
  emit();
};

const COLORS = ['#FFB703', '#06A77D', '#4CC9F0', '#FB8500'];

function Burst() {
  return (
    <span aria-hidden className="burst pointer-events-none absolute inset-0">
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const d = 70 + (i % 3) * 30;
        return <i key={i} style={{ background: COLORS[i % COLORS.length], ['--bx' as string]: `${Math.cos(a) * d}px`, ['--by' as string]: `${Math.sin(a) * d}px`, ['--br' as string]: `${i * 50}deg`, animationDelay: `${(i % 4) * 30}ms` }} />;
      })}
    </span>
  );
}

export function GuessCard({
  question,
  metric,
  a,
  b,
  tone = 'dark',
  children,
  rank,
  color,
}: {
  question: string;
  metric: string;
  a: GuessSide;
  b: GuessSide;
  tone?: 'dark' | 'light';
  /** Extra content shown once the answer is out. */
  children?: React.ReactNode;
  rank?: string;
  /** Solid background colour. The card then uses dark text. */
  color?: string;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const tie = a.value === b.value;
  const winner = tie ? null : a.value > b.value ? a.slug : b.slug;
  const done = pick !== null;
  const correct = done && pick !== 'skip' && (tie || pick === winner);
  const max = Math.max(a.value, b.value, 0.0001);

  // A new pair of countries means a new question.
  useEffect(() => setPick(null), [a.slug, b.slug, metric]);

  const answer = (slug: string) => {
    if (done) return;
    setPick(slug);
    if (slug === 'skip') return track('guess_made', { metric, pair: `${a.slug}-vs-${b.slug}`, result: 'skipped' });
    const ok = tie || slug === winner;
    score = { right: score.right + (ok ? 1 : 0), played: score.played + 1 };
    emit();
    track('guess_made', { metric, pair: `${a.slug}-vs-${b.slug}`, guess: slug, result: ok ? 'correct' : 'wrong' });
    if (score.right >= 5) earnBadge('sharp-eye');
  };

  const solid = Boolean(color);
  const dark = tone === 'dark' && !solid;
  const barB = color === '#F94144' ? '#FFF4E0' : '#F94144';
  return (
    <div className={`relative overflow-hidden rounded-3xl p-5 ${solid ? 'guess-solid text-ink shadow-[0_8px_0_rgba(0,0,0,.38)]' : dark ? 'blk' : 'border-2 border-ink bg-white/70 text-ink'}`} style={solid ? { background: color } : undefined} data-section={`guess:${metric}`}>
      {rank && <p className={`kicker ${solid ? 'text-ink/75' : 'text-sun'}`}>{rank}</p>}
      <p className="h-display mt-1 text-xl sm:text-2xl">{question}</p>

      {!done ? (
        <>
          <div className="mt-4 flex gap-3">
            {[a, b].map((s) => (
              <button key={s.slug} type="button" onClick={() => answer(s.slug)} className="guess-btn" style={dark ? undefined : { borderColor: 'rgba(27,31,94,.25)' }} data-track={`guess:${metric}:${s.slug}`}>
                <img src={flagSrc(s.slug)} alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover ring-2 ring-cream/80" />
                {s.name}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => answer('skip')} className={`mt-3 font-mono text-xs font-medium underline underline-offset-4 ${dark ? 'text-cream/70' : 'text-ink/65'}`}>
            Just show me
          </button>
        </>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} aria-live="polite">
          {pick !== 'skip' && (
            <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-extrabold ${correct ? 'bg-teal text-white' : 'bg-tang text-white'}`}>
              {correct ? (tie ? '✓ Trick question: it is a tie' : '✓ Nailed it') : '✗ Other way round'}
            </p>
          )}
          {correct && <Burst />}
          <div className="mt-4 space-y-3">
            {[a, b].map((s, i) => (
              <div key={s.slug} className="flex items-center gap-3">
                <img src={flagSrc(s.slug)} alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-cream/80" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold">{s.name}</span>
                    <span className={`h-display whitespace-nowrap text-xl ${s.slug === winner ? (solid ? 'rounded-lg bg-ink px-2 py-0.5 !text-cream' : dark ? 'text-sun' : '!text-coral') : ''}`}>
                      <CountUp text={s.display} />
                      {s.isSample && <span className="sample-tag" title="Editorial estimate: no official statistic yet">est.</span>}
                    </span>
                  </p>
                  <div className={`mt-1 h-3 overflow-hidden rounded-full ${dark ? 'bg-cream/15' : 'bg-ink/10'}`}>
                    <motion.div className="h-full rounded-full" style={{ background: i === 0 ? (dark ? '#4CC9F0' : '#1B1F5E') : solid ? barB : '#FFB703' }} initial={{ width: 0 }} animate={{ width: `${Math.max(6, (s.value / max) * 100)}%` }} transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: [0.2, 0.8, 0.2, 1] }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {children && <div className="mt-4">{children}</div>}
        </motion.div>
      )}
    </div>
  );
}

/** Floating score pill. Appears after the first guess on a page. */
export function GuessScore() {
  const s = useSyncExternalStore(subscribe, () => score, () => SERVER);
  useEffect(() => resetScore, []);
  if (!s.played) return null;
  return (
    <motion.div key={s.played} initial={{ scale: 1.25 }} animate={{ scale: 1 }} className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border-2 border-sun bg-night px-4 py-2 font-mono text-sm font-bold text-cream shadow-ticket" aria-live="polite">
      <span aria-hidden>🎯</span> Guesses {s.right}/{s.played}
    </motion.div>
  );
}
