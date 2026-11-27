'use client';


/**
 * Your Passport: stamps for every country explored, badges and quiz record.
 * Reads everything from localStorage through lib/passport.ts.
 */
import Flag from '@/components/Flag';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BADGES, resetPassport, usePassport } from '@/lib/passport';
import { TeleportButton } from '../Bits';
import Stamp from '../Stamp';

interface PassportCountry {
  slug: string;
  name: string;
  flag: string;
  airport: string;
}

export default function PassportClient({ countries }: { countries: PassportCountry[] }) {
  const passport = usePassport();
  const [mounted, setMounted] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => setMounted(true), []);

  const earned = countries.filter((c) => passport.stamps[c.slug]).length;
  const badgeCount = Object.keys(passport.badges).length;

  return (
    <div className="mx-auto max-w-4xl">
      {/* The passport opens like a booklet */}
      <motion.div
        className="panel-dark rounded-2xl p-5 shadow-ticket sm:p-8"
        initial={{ rotateX: -70, opacity: 0 }}
        animate={{ rotateX: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 90, damping: 14 }}
        style={{ transformOrigin: 'top center', transformPerspective: 1200 }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-dashed border-cream/25 pb-4">
          <div>
            <p className="kicker text-cream/70">Visas · Entries</p>
            <h2 className="h-display text-3xl sm:text-4xl">
              {mounted ? earned : 0} of {countries.length} countries
            </h2>
          </div>
          <TeleportButton className="btn btn-sun" countries={countries} />
        </div>

        <div
          className="mt-4 h-3 overflow-hidden rounded-full bg-cream/10"
          role="progressbar"
          aria-label="Countries explored"
          aria-valuemin={0}
          aria-valuemax={countries.length}
          aria-valuenow={mounted ? earned : 0}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-tang via-sun to-[#ffe08a] shadow-[0_0_14px_rgba(255,183,43,.8)] transition-all duration-700" style={{ width: `${mounted ? (earned / countries.length) * 100 : 0}%` }} />
        </div>

        <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {countries.map((c) => {
            const date = mounted ? passport.stamps[c.slug] : undefined;
            return (
              <li key={c.slug}>
                <Link
                  href={`/countries/${c.slug}`}
                  className={`group relative flex aspect-square flex-col items-center justify-center rounded-2xl p-1 text-center transition-all duration-200 hover:-translate-y-1.5 hover:rotate-2 ${
                    date
                      ? 'bg-[#FFF4E0] shadow-[0_0_0_3px_#FFB72B,0_14px_26px_-10px_rgba(255,183,43,.55)]'
                      : 'border-2 border-dashed border-cream/45 bg-white/[0.07] hover:border-sun hover:bg-white/[0.14]'
                  }`}
                  aria-label={date ? `${c.name}: stamped` : `${c.name}: not visited yet`}
                >
                  {date ? (
                    <>
                      <Stamp code={c.airport} name={c.name} date={date} size={112} />
                      <span aria-hidden className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-teal text-sm font-bold text-white shadow-md">
                        ✓
                      </span>
                    </>
                  ) : (
                    <>
                      <Flag slug={c.slug} size={46} className="ring-cream/80 transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6" />
                      <span className="chunk mt-2 text-base text-sun">{c.airport}</span>
                      <span className="text-sm font-bold text-cream">{c.name}</span>
                      <span className="mt-1 rounded-full bg-sun px-2.5 py-0.5 text-[11px] font-extrabold text-ink opacity-0 transition-opacity group-hover:opacity-100">Fly there →</span>
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </motion.div>

      {/* Badges */}
      <section className="mt-10" aria-labelledby="badges-title">
        <h2 id="badges-title" className="h-display text-3xl">
          Badges{' '}
          <span className="font-mono text-base font-medium text-cream/75">
            {mounted ? badgeCount : 0}/{BADGES.length}
          </span>
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BADGES.map((b) => {
            const has = mounted && !!passport.badges[b.id];
            return (
              <li key={b.id} data-rv="pop" className={`flex items-center gap-3 rounded-2xl border-2 p-4 transition-transform hover:-translate-y-1 ${has ? 'border-sun bg-sun text-ink' : 'border-cream/20 text-cream/80'}`}>
                <span aria-hidden className="text-2xl">
                  {has ? '★' : '☆'}
                </span>
                <span>
                  <span className="block font-bold">{b.name}</span>
                  <span className="block text-sm">{b.how}</span>
                  <span className="sr-only">{has ? ' (earned)' : ' (not earned yet)'}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Quiz record + reset */}
      <section className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-cream/20 p-5">
        <p className="font-mono text-sm text-cream">
          Quiz record: played {mounted ? passport.quiz.played : 0} · best score {mounted ? passport.quiz.best : 0}/15 · best streak {mounted ? passport.quiz.bestStreak : 0}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/quiz" className="btn btn-sun">
            Play the quiz
          </Link>
          {confirmReset ? (
            <button
              className="btn bg-coral text-ink"
              onClick={() => {
                resetPassport();
                setConfirmReset(false);
              }}
            >
              Yes, wipe my passport
            </button>
          ) : (
            <button className="btn btn-ghost" onClick={() => setConfirmReset(true)}>
              Reset
            </button>
          )}
        </div>
      </section>
      <p className="mt-4 text-sm text-cream/75">Your passport is stored only in this browser. No account, nothing uploaded. Clearing site data erases it.</p>
    </div>
  );
}
