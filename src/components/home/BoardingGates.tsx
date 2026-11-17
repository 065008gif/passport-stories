'use client';

/**
 * Home page, after the flight: "Boarding now".
 *
 * A teal departures band that clearly starts a new part of the page. A plane
 * hops along a dotted route over four gates; each gate is a small boarding
 * pass the visitor can tear off (click) to start that activity.
 */
import Link from 'next/link';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { track } from '@/lib/analytics';

const GATES = [
  {
    gate: 'A1',
    href: '/your-life',
    from: 'YOU',
    to: '???',
    title: 'Your life, abroad',
    text: 'Plug in your pay, rent and hours. We print the same life in another country.',
    cta: 'Print my pass',
    color: '#FB8500',
  },
  {
    gate: 'A2',
    href: '/compare',
    from: 'IND',
    to: 'JPN',
    title: 'Head to head',
    text: 'Pick any two countries. See who works longer, eats later and travels further.',
    cta: 'Start comparing',
    color: '#4CC9F0',
  },
  {
    gate: 'A3',
    href: '/quiz',
    from: 'XP',
    to: '999',
    title: 'The Play Zone',
    text: 'Guess the country from clues, keep a higher-or-lower streak, race the flags.',
    cta: 'Play now',
    color: '#06A77D',
  },
  {
    gate: 'A4',
    href: '/facts',
    from: 'YOU',
    to: 'ALL',
    title: 'Your fact, live',
    text: 'Lived somewhere? Tell us one true thing. The best ones go up on the site.',
    cta: 'Send a fact',
    color: '#B693FF',
  },
];

// Plane hops: start before gate 1, land on each gate in turn.
const XS = ['2%', '12.5%', '25%', '37.5%', '50%', '62.5%', '75%', '87.5%'];
const YS = [0, 0, -34, 0, -34, 0, -34, 0];
const HOP = 0.75; // seconds per half hop
const LAND = [1, 3, 5, 7].map((k) => k * HOP); // when the plane reaches each gate

export default function BoardingGates() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: '-15% 0px' });
  const reduce = useReducedMotion();
  const go = seen && !reduce;

  return (
    <section className="gates-band relative overflow-hidden" aria-labelledby="gates-title">
      <div aria-hidden className="gates-glow" />
      <div className="container-x relative py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-ink">
              <span className="blink mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#06A77D] align-middle" />
              Boarding now · 4 gates open
            </p>
            <h2 id="gates-title" className="chunk mt-3 text-4xl leading-[0.95] text-ink sm:text-6xl">
              Your turn to <span className="text-cream [-webkit-text-stroke:2px_#1B1F5E] [paint-order:stroke_fill]">take off.</span>
            </h2>
          </div>
          <p className="max-w-sm font-semibold text-ink/80">Pick a gate. Every one ends with something you can keep or share.</p>
        </div>

        <div ref={ref} className="relative mt-10">
          {/* The dotted hop route and the plane (desktop) */}
          <div aria-hidden className="relative hidden h-20 lg:block">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              <path d="M12.5 18 Q25 0 37.5 18 Q50 0 62.5 18 Q75 0 87.5 18" fill="none" stroke="#1B1F5E" strokeOpacity=".7" strokeWidth="3" strokeDasharray="1 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {GATES.map((g, i) => (
              <span key={g.gate} className="absolute bottom-[4px] h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-ink" style={{ left: `${12.5 + i * 25}%`, background: g.color }} />
            ))}
            <motion.span
              className="absolute bottom-3 -ml-5 text-4xl leading-none text-ink drop-shadow-[0_3px_0_rgba(255,244,224,.8)]"
              initial={{ left: XS[0], y: 0 }}
              animate={go ? { left: XS, y: YS } : reduce ? { left: XS[7], y: 0 } : {}}
              transition={{
                left: { duration: HOP * 7, ease: 'linear', times: XS.map((_, k) => k / 7) },
                y: { duration: HOP * 7, times: XS.map((_, k) => k / 7), ease: ['linear', 'easeOut', 'easeIn', 'easeOut', 'easeIn', 'easeOut', 'easeIn'] },
              }}
            >
              ✈
            </motion.span>
          </div>

          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {GATES.map((g, i) => (
              <motion.li
                key={g.gate}
                initial={{ opacity: 0, y: 30, rotate: 0 }}
                animate={seen ? { opacity: 1, y: 0, rotate: i % 2 ? 1.2 : -1.2 } : {}}
                transition={{ delay: reduce ? 0 : LAND[i] - 0.25, type: 'spring', stiffness: 220, damping: 16 }}
                whileHover={{ rotate: 0, y: -8 }}
              >
                <Link href={g.href} onClick={() => track('home_gate_click', { gate: g.gate, target: g.href })} className="gate-pass group flex h-full flex-col overflow-hidden rounded-2xl text-ink">
                  <span className="flex items-center justify-between px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ background: g.color }}>
                    <span>Gate {g.gate}</span>
                    <span>Boarding</span>
                  </span>
                  <span className="flex items-center justify-between px-4 pt-4">
                    <span className="chunk text-3xl leading-none">{g.from}</span>
                    <span className="mx-2 flex-1 border-t-2 border-dashed border-ink/25" />
                    <span aria-hidden className="text-xl" style={{ color: g.color === '#FFB703' ? '#FB8500' : g.color }}>
                      ✈
                    </span>
                    <span className="mx-2 flex-1 border-t-2 border-dashed border-ink/25" />
                    <span className="chunk text-3xl leading-none">{g.to}</span>
                  </span>
                  <span className="chunk mt-4 px-4 text-2xl leading-tight">{g.title}</span>
                  <span className="mt-2 flex-1 px-4 text-[15px] leading-snug text-ink/75">{g.text}</span>
                  <span className="gate-tear relative mt-5 flex items-center justify-between px-4 py-3">
                    <span className="font-bold">{g.cta}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-cream transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-[-8deg]">→</span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
