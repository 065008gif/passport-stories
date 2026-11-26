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
    color: '#FF8A4C',
  },
  {
    gate: 'A2',
    href: '/compare',
    from: 'IND',
    to: 'JPN',
    title: 'Head to head',
    text: 'Pick any two countries. See who works longer, eats later and travels further.',
    cta: 'Start comparing',
    color: '#1AA3CF',
  },
  {
    gate: 'A3',
    href: '/quiz',
    from: 'XP',
    to: '999',
    title: 'The Play Zone',
    text: 'Guess the country from clues, keep a higher-or-lower streak, race the flags.',
    cta: 'Play now',
    color: '#12B5A6',
  },
  {
    gate: 'A4',
    href: '/facts',
    from: 'YOU',
    to: 'ALL',
    title: 'Your fact, live',
    text: 'Lived somewhere? Tell us one true thing. The best ones go up on the site.',
    cta: 'Send a fact',
    color: '#FFC9A8',
  },
];

// Plane hops: start before gate 1, land on each gate in turn.
const XS = ['2%', '12.5%', '25%', '37.5%', '50%', '62.5%', '75%', '87.5%'];
const YS = [0, 0, -28, 0, -28, 0, -28, 0];
const HOP = 0.42; // seconds per half hop (quick, so no card waits long)
const LAND = [1, 3, 5, 7].map((k) => k * HOP); // when the plane reaches each gate

export default function BoardingGates() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: '-15% 0px' });
  const reduce = useReducedMotion();
  const go = seen && !reduce;

  return (
    <section className="gates-band relative overflow-hidden" aria-labelledby="gates-title">
      <div aria-hidden className="gates-glow" />
      <div className="container-x relative py-10 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-ink">
              <span className="blink mr-2 inline-block h-2.5 w-2.5 rounded-full bg-[#12B5A6] align-middle" />
              Boarding now · 4 gates open
            </p>
            <h2 id="gates-title" className="chunk mt-2 text-[1.9rem] leading-[0.95] text-ink sm:mt-3 sm:text-6xl">
              Your turn to <span className="text-cream [-webkit-text-stroke:2px_#1F2A44] [paint-order:stroke_fill]">take off.</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm font-semibold text-ink/80 sm:text-base">Pick a gate. Every one ends with something you can keep or share.</p>
        </div>

        <div ref={ref} className="relative mt-6 sm:mt-10">
          {/* The dotted hop route and the plane (desktop) */}
          <div aria-hidden className="relative mb-2 h-12 sm:h-16 lg:mb-0 lg:h-20">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              <path d="M12.5 18 Q25 0 37.5 18 Q50 0 62.5 18 Q75 0 87.5 18" fill="none" stroke="#1F2A44" strokeOpacity=".7" strokeWidth="3" strokeDasharray="1 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {GATES.map((g, i) => (
              <span key={g.gate} className="absolute bottom-[4px] h-4 w-4 -translate-x-1/2 rounded-full border-[3px] border-ink" style={{ left: `${12.5 + i * 25}%`, background: g.color }}>
                <span className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] font-bold text-ink lg:hidden">{g.gate}</span>
              </span>
            ))}
            <motion.span
              className="absolute bottom-3 -ml-4 text-3xl leading-none text-ink sm:-ml-5 sm:text-4xl drop-shadow-[0_3px_0_rgba(255,244,224,.8)]"
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

          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {GATES.map((g, i) => (
              <motion.li
                key={g.gate}
                initial={{ opacity: 0, y: 30, rotate: 0 }}
                animate={seen ? { opacity: 1, y: 0, rotate: i % 2 ? 1.2 : -1.2 } : {}}
                transition={{ delay: reduce ? 0 : Math.max(0, LAND[i] - 0.2), type: 'spring', stiffness: 260, damping: 18 }}
                whileHover={{ rotate: 0, y: -8 }}
              >
                <Link href={g.href} onClick={() => track('home_gate_click', { gate: g.gate, target: g.href })} className="gate-pass group flex h-full flex-col overflow-hidden rounded-2xl text-ink">
                  <span className="flex items-center justify-between px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] sm:px-4 sm:py-2 sm:text-[11px] sm:tracking-[0.2em]" style={{ background: g.color }}>
                    <span>Gate {g.gate}</span>
                    <span className="hidden sm:inline">Boarding</span>
                  </span>
                  <span className="flex items-center justify-between px-3 pt-3 sm:px-4 sm:pt-4">
                    <span className="chunk text-lg leading-none sm:text-3xl">{g.from}</span>
                    <span className="mx-1 flex-1 border-t-2 border-dashed border-ink/25 sm:mx-2" />
                    <span aria-hidden className="text-sm sm:text-xl" style={{ color: g.color === '#FFC233' ? '#FF8A4C' : g.color }}>
                      ✈
                    </span>
                    <span className="mx-1 flex-1 border-t-2 border-dashed border-ink/25 sm:mx-2" />
                    <span className="chunk text-lg leading-none sm:text-3xl">{g.to}</span>
                  </span>
                  <span className="chunk mt-2.5 px-3 text-[15px] leading-tight sm:mt-4 sm:px-4 sm:text-2xl">{g.title}</span>
                  <span className="mt-2 hidden flex-1 px-4 text-[15px] leading-snug text-ink/75 sm:block">{g.text}</span>
                  <span className="flex-1 sm:hidden" />
                  <span className="gate-tear relative mt-3 flex items-center justify-between px-3 py-2 sm:mt-5 sm:px-4 sm:py-3">
                    <span className="text-[12px] font-bold sm:text-base">{g.cta}</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm text-cream sm:h-9 sm:w-9 sm:text-base transition-transform duration-200 group-hover:translate-x-1 group-hover:rotate-[-8deg]">→</span>
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
