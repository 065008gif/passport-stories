'use client';

/**
 * The Play Zone: three quick games on the same country data.
 *
 *  Clue Chase       5 rounds. One clue to start; ask for more if you need
 *                   them. Fewer clues, more points.
 *  Higher or Lower  Which country has the bigger number? Five lives.
 *  Flag Run         Ten flags. Name as many as you can.
 *
 * There are no clocks: nobody is rushed. Streaks multiply the points.
 *
 * XP, level, personal bests and the daily streak are kept in this browser
 * (localStorage key ps_arcade_v1). Nothing is uploaded.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { flagSrc } from '@/components/Flag';
import { Tilt } from '@/components/Fx';
import { METRICS, QUESTIONS, formatMetric } from '@/data/topics';
import type { MetricKey } from '@/data/types';
import { track } from '@/lib/analytics';
import { getPassport, recordQuiz } from '@/lib/passport';
import { downloadStoryCard } from '@/lib/shareCard';
import { playThunk } from '@/lib/sound';

export interface QuizCountry {
  slug: string;
  name: string;
  airport: string;
  clues: [string, string, string];
  stats: Record<string, number>;
}

type Mode = 'clue' | 'hl' | 'flag';

const MODES: Record<Mode, { name: string; emoji: string; line: string; how: string; color: string }> = {
  clue: { name: 'Clue Chase', emoji: '🕵️', line: 'Name the country from its clues.', how: '5 rounds · fewer clues = more points', color: '#FFC233' },
  hl: { name: 'Higher or Lower', emoji: '⚖️', line: 'Who has the bigger number?', how: '5 lives · take your time', color: '#FF8A4C' },
  flag: { name: 'Flag Run', emoji: '🏁', line: 'Ten flags. How many do you know?', how: '10 flags · no clock', color: '#1AA3CF' },
};

const TITLES = ['Tourist', 'Backpacker', 'Explorer', 'Navigator', 'Globetrotter', 'Captain', 'Legend'];
const XP_PER_LEVEL = 400;
const CLUE_ROUNDS = 5;
const FLAG_ROUNDS = 10;
const LIVES = 5;
const CLUE_POINTS = [300, 200, 100];
const HL_KEYS = Object.keys(METRICS) as MetricKey[];

/* ------------------------------ saved progress ------------------------------ */

interface Save {
  xp: number;
  games: number;
  best: Record<Mode, number>;
  day: string;
  dayStreak: number;
}
const EMPTY: Save = { xp: 0, games: 0, best: { clue: 0, hl: 0, flag: 0 }, day: '', dayStreak: 0 };
const KEY = 'ps_arcade_v1';
const today = () => new Date().toISOString().slice(0, 10);
const loadSave = (): Save => {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return EMPTY;
  }
};
const levelOf = (xp: number) => Math.floor(xp / XP_PER_LEVEL);
const titleOf = (xp: number) => TITLES[Math.min(TITLES.length - 1, levelOf(xp))];

/* --------------------------------- helpers --------------------------------- */

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const multOf = (streak: number) => 1 + Math.min(streak, 4) * 0.25;

interface Question {
  kind: Mode;
  prompt: string;
  /** Clue Chase only */
  clues?: string[];
  /** Flag Rush only: the flag to show */
  flag?: string;
  options: QuizCountry[];
  answer: string;
  metric?: MetricKey;
}

function makeQuestion(mode: Mode, countries: QuizCountry[], avoid?: string): Question {
  if (mode === 'hl') {
    for (;;) {
      const metric = HL_KEYS[Math.floor(Math.random() * HL_KEYS.length)];
      const [a, b] = shuffle(countries);
      if (a.stats[metric] === b.stats[metric]) continue;
      return { kind: 'hl', prompt: QUESTIONS[metric], options: [a, b], answer: a.stats[metric] > b.stats[metric] ? a.slug : b.slug, metric };
    }
  }
  const pool = countries.filter((c) => c.slug !== avoid);
  const answer = pool[Math.floor(Math.random() * pool.length)];
  const options = shuffle([answer, ...shuffle(countries.filter((c) => c !== answer)).slice(0, 3)]);
  return mode === 'clue'
    ? { kind: 'clue', prompt: 'Which country is this?', clues: answer.clues, options, answer: answer.slug }
    : { kind: 'flag', prompt: 'Whose flag?', flag: answer.slug, options, answer: answer.slug };
}

const COLORS = ['#FFC233', '#12B5A6', '#1AA3CF', '#FF8A4C'];
const LETTER_COLORS = ['#FFC233', '#1AA3CF', '#12B5A6', '#FF8A4C'];
function Confetti() {
  return (
    <span aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {Array.from({ length: 60 }, (_, i) => (
        <i key={i} className="arcade-confetti" style={{ left: `${(i * 37) % 100}%`, background: COLORS[i % COLORS.length], animationDelay: `${(i % 12) * 60}ms`, animationDuration: `${1.6 + (i % 5) * 0.3}s` }} />
      ))}
    </span>
  );
}

/* ---------------------------------- game ---------------------------------- */

export default function QuizClient({ countries }: { countries: QuizCountry[] }) {
  const [save, setSave] = useState<Save>(EMPTY);
  const [phase, setPhase] = useState<'lobby' | 'play' | 'done'>('lobby');
  const [mode, setMode] = useState<Mode>('clue');
  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [round, setRound] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [clues, setClues] = useState(1); // clues showing in Clue Chase
  const [pop, setPop] = useState<{ id: number; text: string; good: boolean } | null>(null);
  const [gained, setGained] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [busy, setBusy] = useState(false);

  // Mutable mirror of the numbers the timer needs.
  const g = useRef({ score: 0, streak: 0, bestStreak: 0, correct: 0, round: 0, lives: LIVES, clues: 1, locked: false, over: false });

  useEffect(() => setSave(loadSave()), []);

  const finish = useCallback(() => {
    if (g.current.over) return;
    g.current.over = true;
    const s = g.current;
    const prev = loadSave();
    const xp = Math.round(s.score / 10) + 20;
    const t = today();
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const next: Save = {
      xp: prev.xp + xp,
      games: prev.games + 1,
      best: { ...prev.best, [mode]: Math.max(prev.best[mode], s.score) },
      day: t,
      dayStreak: prev.day === t ? prev.dayStreak || 1 : prev.day === yesterday ? prev.dayStreak + 1 : 1,
    };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    setNewBest(s.score > prev.best[mode] && s.score > 0);
    setGained(xp);
    setSave(next);
    setPhase('done');
    recordQuiz(mode === 'clue' ? s.correct * 3 : 0, 15, s.bestStreak);
    track('quiz_completed', { mode, quiz_score: s.score, max_score: mode === 'clue' ? 3000 : mode === 'flag' ? 2000 : 0, correct_answers: s.correct, best_streak: s.bestStreak, level: levelOf(next.xp) + 1 });
  }, [mode]);

  const ask = useCallback(
    (m: Mode, avoid?: string) => {
      g.current.locked = false;
      setPicked(null);
      g.current.clues = 1;
      setClues(1);
      setQ(makeQuestion(m, countries, avoid));
    },
    [countries],
  );

  const start = (m: Mode) => {
    g.current = { score: 0, streak: 0, bestStreak: 0, correct: 0, round: 0, lives: LIVES, clues: 1, locked: false, over: false };
    setMode(m);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrect(0);
    setRound(0);
    setLives(LIVES);
    setPhase('play');
    ask(m);
    track('quiz_started', { mode: m });
  };

  const settle = useCallback(
    (ok: boolean, slug: string | null) => {
      const s = g.current;
      if (s.locked || s.over || !q) return;
      let points = 0;
      if (ok) {
        const base = mode === 'clue' ? CLUE_POINTS[s.clues - 1] : 100;
        points = Math.round(base * multOf(s.streak));
        s.score += points;
        s.streak += 1;
        s.correct += 1;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
      } else {
        s.streak = 0;
        if (mode === 'hl') s.lives -= 1;
      }
      setScore(s.score);
      setStreak(s.streak);
      setBestStreak(s.bestStreak);
      setCorrect(s.correct);
      setLives(s.lives);
      setPicked(slug || 'timeout');
      setPop({ id: Date.now(), text: ok ? `+${points}` : mode === 'hl' ? '−1 ❤' : 'Not this time', good: ok });
      if (ok && getPassport().sound) playThunk();

      s.locked = true;
      s.round += 1;
      setRound(s.round);
      const over = mode === 'clue' ? s.round >= CLUE_ROUNDS : mode === 'flag' ? s.round >= FLAG_ROUNDS : s.lives <= 0;
      window.setTimeout(() => (over ? finish() : ask(mode, q.answer)), mode === 'clue' ? 1700 : 1300);
    },
    [q, mode, ask, finish],
  );

  const download = async () => {
    setBusy(true);
    await downloadStoryCard({
      filename: `passport-stories-${mode}-${score}.png`,
      kicker: `Passport Stories Play Zone · ${MODES[mode].name}`,
      title: `I scored ${score.toLocaleString('en-IN')}`,
      from: 'ME',
      to: `L${levelOf(save.xp) + 1}`,
      rows: [
        { label: 'Rank', value: titleOf(save.xp) },
        { label: 'Correct answers', value: String(correct) },
        { label: 'Best streak', value: `${bestStreak} in a row` },
      ],
      quote: 'Think you know how the world lives? Beat my score.',
    });
    track('share_card_downloaded', { card_type: 'quiz', quiz_score: score, mode });
    setBusy(false);
  };

  const level = levelOf(save.xp);
  const xpIn = save.xp % XP_PER_LEVEL;

  /* --------------------------------- lobby --------------------------------- */
  if (phase === 'lobby') {
    return (
      <div className="mx-auto max-w-4xl" data-section="arcade-lobby">
        {/* Player card */}
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-cream/20 bg-night/70 p-4 backdrop-blur sm:p-5" data-rv="up">
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-sun text-ink shadow-[0_4px_0_#FF8A4C]">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest">Level</span>
            <span className="h-display text-3xl leading-none">{level + 1}</span>
          </div>
          <div className="min-w-[10rem] flex-1">
            <p className="h-display text-2xl">{titleOf(save.xp)}</p>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-cream/15">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-coral via-tang to-sun" initial={{ width: 0 }} animate={{ width: `${(xpIn / XP_PER_LEVEL) * 100}%` }} transition={{ duration: 0.8 }} />
            </div>
            <p className="mt-1 font-mono text-[11px] text-cream/70">
              {xpIn}/{XP_PER_LEVEL} XP to {TITLES[Math.min(TITLES.length - 1, level + 1)]}
            </p>
          </div>
          <dl className="flex gap-5 text-center">
            <div>
              <dd className="h-display text-2xl">🔥 {save.dayStreak}</dd>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-cream/70">day streak</dt>
            </div>
            <div>
              <dd className="h-display text-2xl">{save.games}</dd>
              <dt className="font-mono text-[10px] uppercase tracking-wider text-cream/70">games</dt>
            </div>
          </dl>
        </div>

        {/* Modes */}
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {(Object.keys(MODES) as Mode[]).map((m, i) => {
            const d = MODES[m];
            return (
              <li key={m} data-rv="pop" style={{ ['--d' as string]: `${i * 90}ms` }}>
                <Tilt className="h-full rounded-3xl">
                  <button onClick={() => start(m)} data-track={`arcade-start:${m}`} className="arcade-mode group" style={{ ['--accent' as string]: d.color }}>
                    <span className="arcade-emoji" aria-hidden>
                      {d.emoji}
                    </span>
                    <span className="chunk mt-3 block text-[1.7rem]">{d.name}</span>
                    <span className="mt-1 block text-[15px] font-semibold text-cream/90">{d.line}</span>
                    <span className="mt-1 block font-mono text-[11px] uppercase tracking-wider text-cream/60">{d.how}</span>
                    <span className="mt-4 flex items-center justify-between">
                      <span className="font-mono text-xs text-cream/75">
                        Best <b className="text-sun">{save.best[m].toLocaleString('en-IN')}</b>
                      </span>
                      <span className="rounded-full px-4 py-2 text-sm font-extrabold text-ink transition-transform group-hover:scale-110" style={{ background: d.color }}>
                        Play ▶
                      </span>
                    </span>
                  </button>
                </Tilt>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-center font-mono text-xs text-cream/60">No clocks, no rush. Every game earns XP; play on consecutive days to build your streak. Progress is saved in this browser only.</p>
      </div>
    );
  }

  /* --------------------------------- result --------------------------------- */
  if (phase === 'done') {
    const verdict = score === 0 ? 'Lost luggage' : newBest ? 'New personal best!' : correct >= 8 ? 'On fire' : correct >= 4 ? 'Smooth landing' : 'Bumpy flight';
    return (
      <div className="mx-auto max-w-xl text-center" data-section="arcade-result">
        {(newBest || correct >= 4) && <Confetti />}
        <motion.div initial={{ scale: 0.8, opacity: 0, rotate: -3 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="overflow-hidden rounded-3xl border-2 border-sun bg-night/80 backdrop-blur">
          <p className="bg-sun px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink">
            {MODES[mode].name} · {verdict}
          </p>
          <div className="p-6 sm:p-8">
            <p className="sign text-7xl text-sun sm:text-8xl">{score.toLocaleString('en-IN')}</p>
            <p className="font-mono text-xs uppercase tracking-widest text-cream/70">points</p>
            <dl className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-2">
              {[
                ['Correct', correct],
                ['Best streak', bestStreak],
                ['Best ever', save.best[mode].toLocaleString('en-IN')],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-cream/10 p-3">
                  <dd className="h-display text-2xl">{v}</dd>
                  <dt className="font-mono text-[10px] uppercase tracking-wider text-cream/70">{k}</dt>
                </div>
              ))}
            </dl>
            <div className="mt-5 rounded-2xl bg-cream/10 p-3 text-left">
              <p className="flex items-baseline justify-between text-sm font-bold">
                <span>
                  Level {level + 1} · {titleOf(save.xp)}
                </span>
                <motion.span initial={{ scale: 2, color: '#FFC233' }} animate={{ scale: 1 }} className="font-mono text-sun">
                  +{gained} XP
                </motion.span>
              </p>
              <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-cream/15">
                <motion.div className="h-full rounded-full bg-gradient-to-r from-coral via-tang to-sun" initial={{ width: 0 }} animate={{ width: `${(xpIn / XP_PER_LEVEL) * 100}%` }} transition={{ duration: 1, delay: 0.3 }} />
              </div>
              <p className="mt-1 font-mono text-[11px] text-cream/70">🔥 {save.dayStreak}-day streak. Come back tomorrow to keep it.</p>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => start(mode)} className="btn btn-sun" autoFocus>
                Play again ↻
              </button>
              <button onClick={() => setPhase('lobby')} className="btn btn-ghost">
                Other games
              </button>
              <button onClick={download} disabled={busy} className="btn btn-ghost">
                <span aria-hidden>⬇</span> {busy ? 'Printing…' : 'Share card'}
              </button>
            </div>
            <Link href="/passport" className="mt-4 inline-block font-mono text-xs text-cream/70 underline underline-offset-4">
              See your badges
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ---------------------------------- play ---------------------------------- */
  if (!q) return null;
  const rounds = mode === 'clue' ? CLUE_ROUNDS : mode === 'flag' ? FLAG_ROUNDS : 0;
  const shownClues = mode === 'clue' ? (picked ? 3 : clues) : 0;
  const moreClue = () => {
    if (g.current.locked || clues >= 3) return;
    g.current.clues = clues + 1;
    setClues(clues + 1);
  };
  const mult = multOf(streak);
  const done = picked !== null;

  return (
    <div className="mx-auto max-w-2xl" data-section={`arcade-play:${mode}`}>
      {/* HUD */}
      <div className="mb-3 flex items-center justify-between gap-3 font-mono text-sm font-bold">
        <span className="rounded-full bg-night/70 px-3 py-1.5 backdrop-blur">
          {mode === 'hl' ? <span aria-label={`${lives} lives`}>{'❤️'.repeat(Math.max(0, lives))}{'🖤'.repeat(Math.max(0, LIVES - lives))}</span> : `${mode === 'clue' ? 'Round' : 'Flag'} ${Math.min(round + 1, rounds)}/${rounds}`}
        </span>
        <motion.span key={streak} initial={{ scale: streak ? 1.5 : 1 }} animate={{ scale: 1 }} className={`rounded-full px-3 py-1.5 ${streak >= 2 ? 'bg-tang text-white' : 'bg-night/70 backdrop-blur'}`}>
          {streak >= 2 ? `🔥 ${streak} streak · x${mult}` : 'No streak yet'}
        </motion.span>
        <motion.span key={score} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="rounded-full bg-sun px-3 py-1.5 text-ink">
          {score.toLocaleString('en-IN')}
        </motion.span>
      </div>
      {rounds > 0 && (
        <ol className="flex gap-1.5" aria-label={`Question ${Math.min(round + 1, rounds)} of ${rounds}`}>
          {Array.from({ length: rounds }, (_, i) => (
            <li key={i} className={`h-2.5 flex-1 rounded-full transition-colors duration-300 ${i < round ? 'bg-sun' : i === round ? 'bg-paper' : 'bg-cream/20'}`} />
          ))}
        </ol>
      )}

      <div className={`arcade-card mt-4 p-5 sm:p-7 ${done && picked !== q.answer ? 'arcade-shake' : ''}`}>
        <AnimatePresence>
          {pop && (
            <motion.span key={pop.id} initial={{ opacity: 0, y: 10, scale: 0.6 }} animate={{ opacity: 1, y: -24, scale: 1.2 }} exit={{ opacity: 0, y: -60 }} transition={{ duration: 0.5 }} onAnimationComplete={() => setPop(null)} className={`h-display pointer-events-none absolute right-6 top-4 z-10 text-3xl ${pop.good ? 'text-sun' : 'text-coral'}`}>
              {pop.text}
            </motion.span>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="chunk text-xl text-sun sm:text-2xl">{mode === 'hl' ? 'Higher or lower?' : q.prompt}</p>
          {mode === 'clue' && (
            <ol className="flex items-center gap-1.5 font-mono text-[11px] font-bold" aria-label="Points for a right answer">
              {CLUE_POINTS.map((pts, i) => (
                <li key={pts} className={`rounded-full px-2.5 py-1 transition-all ${i === shownClues - 1 ? 'scale-110 bg-sun text-ink' : i < shownClues - 1 ? 'bg-cream/10 text-cream/40 line-through' : 'bg-cream/10 text-cream/75'}`}>
                  {i + 1} {i ? 'clues' : 'clue'} = {pts}
                </li>
              ))}
            </ol>
          )}
        </div>

        {mode === 'clue' && (
          <ol className="mt-4 min-h-[11.5rem] space-y-2.5" aria-live="polite">
            <AnimatePresence initial={false}>
              {q.clues!.slice(0, shownClues).map((clue, i) => (
                <motion.li key={`${q.answer}-${i}`} initial={{ opacity: 0, x: -30, rotate: -1 }} animate={{ opacity: 1, x: 0, rotate: 0 }} className="arcade-clue flex items-center gap-3 rounded-2xl p-3.5" style={{ ['--l' as string]: LETTER_COLORS[i] }}>
                  <span className="chunk flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm text-ink" style={{ background: LETTER_COLORS[i] }}>
                    {i + 1}
                  </span>
                  <span className="text-[1.05rem] font-bold leading-snug">{clue}</span>
                </motion.li>
              ))}
            </AnimatePresence>
            {shownClues < 3 && (
              <li>
                <button type="button" onClick={moreClue} className="flex items-center gap-2 rounded-full bg-cream/10 px-4 py-2.5 text-sm font-bold text-cream transition-transform hover:-translate-y-0.5 hover:bg-cream/20">
                  <span aria-hidden>💡</span> Stuck? Show clue {shownClues + 1}
                  <span className="rounded-full bg-night/60 px-2 py-0.5 font-mono text-[11px] text-sun">then a right answer scores {CLUE_POINTS[shownClues]}</span>
                </button>
              </li>
            )}
          </ol>
        )}

        {mode === 'flag' && (
          <motion.div key={q.flag} initial={{ scale: 0.5, rotate: -12, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }} className="my-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flagSrc(q.flag!)} alt="Flag to guess" width={150} height={150} className="h-36 w-36 rounded-3xl border-4 border-cream object-cover shadow-[0_18px_40px_-12px_rgba(0,0,0,.8)]" />
          </motion.div>
        )}

        {mode === 'hl' && <p className="h-display mt-3 text-2xl sm:text-3xl">{q.prompt}</p>}

        <div className={`mt-4 grid gap-3 ${mode === 'hl' ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {q.options.map((o, oi) => {
            const isAnswer = o.slug === q.answer;
            const state = !done ? 'idle' : isAnswer ? 'right' : picked === o.slug ? 'wrong' : 'dim';
            return (
              <button
                key={o.slug}
                onClick={() => settle(isAnswer, o.slug)}
                disabled={done}
                className={`arcade-option ${state}`}
              >
                {mode !== 'hl' && (
                  <span className="arcade-letter" style={{ ['--l' as string]: LETTER_COLORS[oi % 4] }}>
                    {'ABCD'[oi]}
                  </span>
                )}
                {mode !== 'flag' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={flagSrc(o.slug)} alt="" width={mode === 'hl' ? 64 : 34} height={mode === 'hl' ? 64 : 34} className={`${mode === 'hl' ? 'h-16 w-16' : 'h-9 w-9'} shrink-0 rounded-full object-cover ring-2 ring-cream/80`} />
                )}
                <span className="min-w-0">
                  <span className="block truncate">{o.name}</span>
                  {mode === 'hl' && done && q.metric && <span className="block font-mono text-sm font-bold text-sun">{formatMetric(q.metric, o.stats[q.metric])}</span>}
                </span>
                {state === 'right' && <span className="ml-auto" aria-hidden>✓</span>}
                {state === 'wrong' && <span className="ml-auto" aria-hidden>✗</span>}
              </button>
            );
          })}
        </div>
        {mode === 'hl' && q.metric && <p className="mt-3 font-mono text-[11px] text-cream/55">{METRICS[q.metric].label} · see About for sources</p>}
      </div>

      <button onClick={finish} className="mx-auto mt-4 block font-mono text-xs text-cream/60 underline underline-offset-4">
        End game
      </button>
    </div>
  );
}
