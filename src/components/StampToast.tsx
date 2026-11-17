'use client';

/**
 * What happens when something is earned.
 *
 *  - A country stamp (first visit to a country): a passport page appears in
 *    the middle of the screen, the stamp slams onto it, the page shakes,
 *    and then it shrinks away into the passport counter in the header.
 *  - A badge: the same treatment, a big card in the middle of the screen.
 *
 * lib/passport.ts fires a `ps:toast` window event; this listens for it.
 * Nothing here blocks clicks or scrolling.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ToastDetail } from '@/lib/passport';
import Stamp from './Stamp';

type Shown = ToastDetail & { id: number; flyX: number; flyY: number };

export default function StampToast() {
  const [toast, setToast] = useState<Shown | null>(null);

  useEffect(() => {
    let timer: number;
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail;
      // Where the passport counter is, so the stamped page can fly into it.
      const target = document.querySelector('[data-passport-button]')?.getBoundingClientRect();
      const flyX = target ? target.left + target.width / 2 - window.innerWidth / 2 : window.innerWidth / 2 - 60;
      const flyY = target ? target.top + target.height / 2 - window.innerHeight / 2 : -window.innerHeight / 2 + 30;
      setToast({ ...detail, id: Date.now(), flyX, flyY });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setToast(null), detail.kind === 'stamp' ? 2700 : 2600);
    };
    window.addEventListener('ps:toast', onToast);
    return () => {
      window.removeEventListener('ps:toast', onToast);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div aria-live="polite">
      <AnimatePresence>
        {toast && toast.kind === 'stamp' && (
          <motion.div key={toast.id} className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center" initial={{ opacity: 1 }} exit={{ opacity: 1 }} transition={{ duration: 0.45 }}>
            <motion.div aria-hidden className="absolute inset-0 bg-night/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
            <motion.div
              className="relative w-[min(88vw,30rem)]"
              initial={{ y: 60, opacity: 0, rotate: -6, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, rotate: -3, scale: 1 }}
              exit={{ x: toast.flyX, y: toast.flyY, scale: 0.08, opacity: 0.2, rotate: 20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            >
              {/* A page of the passport */}
              <div className="paper stamp-shake rounded-3xl border-2 border-ink/10 p-6 shadow-[0_30px_80px_rgba(0,0,0,.7)]">
                <p className="flex justify-between border-b-2 border-dashed border-ink/20 pb-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink/60">
                  <span>Visas</span>
                  <span>{toast.note}</span>
                </p>
                <div className="flex justify-center py-7">
                  <motion.div initial={{ scale: 3.2, opacity: 0, rotate: -35 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.28, type: 'spring', stiffness: 620, damping: 19 }}>
                    <Stamp code={toast.code} name={toast.title} date={new Date().toISOString()} size={250} />
                  </motion.div>
                </div>
                <p className="chunk text-center text-3xl text-ink sm:text-4xl">Welcome to {toast.title}</p>
                <p className="mt-1 text-center text-base font-bold text-ink/70">Passport stamped</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {toast && toast.kind === 'badge' && (
          <motion.div key={toast.id} className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center" initial={{ opacity: 1 }} exit={{ opacity: 1 }} transition={{ duration: 0.45 }}>
            <motion.div aria-hidden className="absolute inset-0 bg-night/70 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
            <motion.div
              className="relative w-[min(88vw,26rem)]"
              initial={{ y: 60, opacity: 0, rotate: 5, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, rotate: 2, scale: 1 }}
              exit={{ x: toast.flyX, y: toast.flyY, scale: 0.08, opacity: 0.2, rotate: -20 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            >
              <div className="paper stamp-shake rounded-3xl border-2 border-ink/10 p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,.7)]">
                <p className="border-b-2 border-dashed border-ink/20 pb-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-ink/60">{toast.note}</p>
                <div className="flex justify-center py-6">
                  <motion.div initial={{ scale: 3.2, opacity: 0, rotate: 35 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.28, type: 'spring', stiffness: 620, damping: 19 }}>
                    <Stamp code={toast.code} name={toast.title} size={200} label="BADGE" />
                  </motion.div>
                </div>
                <p className="chunk text-3xl text-ink">{toast.title}</p>
                <p className="mt-1 text-base font-bold text-ink/70">New badge in your passport</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
