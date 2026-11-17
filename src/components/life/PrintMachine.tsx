'use client';

/**
 * The boarding pass printer.
 *
 * <PrintingOverlay> fills the screen while the next page loads after
 * "Print my boarding pass", so the wait feels like a printer warming up
 * instead of a frozen site.
 *
 * <PrintReveal> wraps the finished pass on the result page: the pass feeds
 * out of the printer slot line by line, then the printer slides away.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Flag from '@/components/Flag';

const KEY = 'ps-printing';

/** Mark that a pass is being printed, so the next page plays the reveal. */
export function markPrinting() {
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {}
}

/** True (once) if a print was started in the last few seconds. */
export function takePrinting(): boolean {
  try {
    const t = Number(sessionStorage.getItem(KEY) || 0);
    sessionStorage.removeItem(KEY);
    return Date.now() - t < 15000;
  } catch {
    return false;
  }
}

const LINES = ['Checking your bags', 'Converting your rupees', 'Measuring the commute', 'Stamping your passport', 'Warming up the printer'];

/** The printer body: a chunky indigo machine with a glowing slot. */
function Printer({ active = true }: { active?: boolean }) {
  return (
    <div className="relative z-10 mx-auto w-full">
      <div className="printer-body relative rounded-[22px] border-[3px] border-ink px-5 pb-7 pt-4">
        <div className="flex items-center justify-between">
          <span className="chunk text-lg text-ink">PS · Gate printer</span>
          <span className="flex gap-1.5">
            <span className={`h-3.5 w-3.5 rounded-full border-2 border-ink bg-teal ${active ? 'animate-pulse' : ''}`} />
            <span className={`h-3.5 w-3.5 rounded-full border-2 border-ink bg-sky ${active ? 'print-blink' : ''}`} />
          </span>
        </div>
        {/* the slot */}
        <div className="absolute inset-x-6 bottom-2.5 h-3.5 rounded-full bg-ink">
          <div className={`absolute inset-x-3 top-[5px] h-1 rounded-full bg-sun ${active ? 'print-scan' : 'opacity-0'}`} />
        </div>
      </div>
    </div>
  );
}

/** Full-screen printing scene shown while the result page loads. */
export function PrintingOverlay({ show, dest }: { show: boolean; dest?: { slug: string; name: string; airport: string } }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!show) return;
    setI(0);
    const t = setInterval(() => setI((n) => (n + 1) % LINES.length), 700);
    return () => clearInterval(t);
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="printing"
          className="print-overlay fixed inset-0 z-[80] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="status"
          aria-live="polite"
        >
          <div className="w-full max-w-md text-center">
            <Printer />
            {/* paper feeding out in short jolts */}
            <div className="relative mx-auto -mt-3 h-48 w-[86%] overflow-hidden">
              <div className="print-feed absolute inset-x-0 top-0 overflow-hidden rounded-b-2xl border-[3px] border-t-0 border-ink text-ink">
                <div className="h-3 bg-ink" />
                <div className="bright-pass-route flex items-center justify-between px-4 pb-2 pt-3">
                  <span className="chunk text-3xl">YOU</span>
                  <span className="font-mono font-bold text-ink">✈ · · · · ·</span>
                  <span className="chunk flex items-center gap-2 text-3xl">
                    {dest && <Flag slug={dest.slug} size={26} />}
                    {dest?.airport || '???'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-ink p-2">
                  <div className="h-7 rounded-md bg-sun" />
                  <div className="h-7 rounded-md bg-sky" />
                  <div className="h-7 rounded-md bg-violet" />
                </div>
                <div className="bright-pass-stub px-4 py-3">
                  <div className="barcode h-7 opacity-80" />
                </div>
              </div>
            </div>
            <p className="chunk mt-6 text-3xl text-cream">
              Printing your pass{dest ? ` to ${dest.name}` : ''}
            </p>
            <p className="mt-2 h-6 font-mono text-sm font-bold uppercase tracking-[0.2em] text-sun">
              <AnimatePresence mode="wait">
                <motion.span key={i} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="inline-block">
                  {LINES[i]}…
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Wraps the finished pass. When `play` is true the printer sits on top and
 * the pass feeds out of it, then the printer lifts away.
 */
export function PrintReveal({ play, children }: { play: boolean; children: ReactNode }) {
  const [done, setDone] = useState(!play);
  useEffect(() => {
    if (!play) return;
    const t = setTimeout(() => setDone(true), 2300);
    return () => clearTimeout(t);
  }, [play]);

  if (!play) return <>{children}</>;

  return (
    <div className="relative">
      <AnimatePresence>
        {!done && (
          <motion.div key="printer" className="relative z-10 mx-auto max-w-[92%]" initial={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0, transition: { duration: 0.45 } }}>
            <Printer />
          </motion.div>
        )}
      </AnimatePresence>
      <div className={`relative ${done ? '' : '-mt-3 overflow-hidden'}`}>
        <motion.div
          initial={{ y: '-100%' }}
          animate={{ y: ['-100%', '-78%', '-74%', '-52%', '-48%', '-26%', '-22%', '0%'] }}
          transition={{ duration: 1.9, times: [0, 0.14, 0.24, 0.42, 0.52, 0.7, 0.8, 1], ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
