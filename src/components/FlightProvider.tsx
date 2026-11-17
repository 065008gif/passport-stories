'use client';

/**
 * The "Flying to ..." page change.
 *
 * Any component can call `const board = useBoard()` and then
 * `board('/countries/japan', { name: 'Japan', code: 'NRT' })`.
 *
 * The screen cuts to the night sky above the Earth's curve, a paper plane
 * flies a dotted arc from DEL to the destination with clouds streaking past,
 * and the country page is waiting when it lands. About one second in total.
 * With reduced motion it is a plain navigation.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface Destination {
  name: string;
  code: string;
}
type Board = (href: string, dest?: Destination) => void;

const FLIGHT_MS = 780;
const FlightContext = createContext<Board>(() => undefined);
export const useBoard = () => useContext(FlightContext);

// The arc the plane flies: a quadratic curve from P0 over P1 to P2 (SVG units).
const P0 = [34, 150];
const P1 = [200, -28];
const P2 = [366, 150];
const ARC = `M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`;

function Arc({ code }: { code: string }) {
  const plane = useRef<SVGGElement>(null);
  const trail = useRef<SVGPathElement>(null);

  useEffect(() => {
    const start = performance.now();
    const length = trail.current?.getTotalLength() || 420;
    if (trail.current) trail.current.style.strokeDasharray = `${length}`;
    let raf = 0;
    const tick = (now: number) => {
      const linear = Math.min(1, (now - start) / FLIGHT_MS);
      const t = linear < 0.5 ? 2 * linear * linear : 1 - Math.pow(-2 * linear + 2, 2) / 2; // ease in and out
      const u = 1 - t;
      const x = u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0];
      const y = u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1];
      const dx = 2 * u * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
      const dy = 2 * u * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
      plane.current?.setAttribute('transform', `translate(${x} ${y}) rotate(${(Math.atan2(dy, dx) * 180) / Math.PI})`);
      if (trail.current) trail.current.style.strokeDashoffset = `${length * (1 - t)}`;
      if (linear < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg viewBox="0 0 400 200" className="w-[min(94vw,46rem)]" aria-hidden>
      <path d={ARC} fill="none" stroke="#FFF4E0" strokeOpacity=".28" strokeWidth="2" strokeDasharray="2 8" strokeLinecap="round" />
      <path ref={trail} d={ARC} fill="none" stroke="#FFF4E0" strokeWidth="3" strokeLinecap="round" />
      <circle cx={P0[0]} cy={P0[1]} r="5" fill="#FFF4E0" />
      <circle cx={P2[0]} cy={P2[1]} r="7" fill="#FFF4E0" />
      <circle cx={P2[0]} cy={P2[1]} r="13" fill="none" stroke="#FFF4E0" strokeOpacity=".5" strokeWidth="2" />
      <g fill="#FFF4E0" fontFamily="'JetBrains Mono Variable', monospace" fontSize="15" fontWeight="700" textAnchor="middle">
        <text x={P0[0]} y="180">
          DEL
        </text>
        <text x={P2[0]} y="180" fill="#FFF4E0">
          {code}
        </text>
      </g>
      {/* Paper plane, nose pointing right, drawn around its own centre */}
      <g ref={plane} transform={`translate(${P0[0]} ${P0[1]})`}>
        <path d="M16 0 L-13 -11 L-7 0 Z" fill="#FFF4E0" />
        <path d="M16 0 L-13 11 L-7 0 Z" fill="#D9CFBD" />
        <path d="M-7 0 L-11 5 L16 0 Z" fill="#B9AF9E" />
      </g>
    </svg>
  );
}

export default function FlightProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [flight, setFlight] = useState<(Destination & { href: string }) | null>(null);

  const board = useCallback<Board>(
    (href, dest) => {
      if (reduce || !dest) {
        router.push(href);
        return;
      }
      setFlight({ ...dest, href });
      router.prefetch(href);
      window.setTimeout(() => router.push(href), FLIGHT_MS + 60);
      // Safety net: never leave the overlay up if navigation is a no-op.
      window.setTimeout(() => setFlight(null), 3500);
    },
    [reduce, router],
  );

  // Once the new page is showing, lift the overlay.
  useEffect(() => {
    const t = window.setTimeout(() => setFlight(null), 140);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <FlightContext.Provider value={board}>
      {children}
      <AnimatePresence>
        {flight && (
          <motion.div
            key="flight"
            role="status"
            aria-live="polite"
            className="sunset-sky fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden px-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            {/* Clouds streaking past, and the Earth's edge below */}
            <span className="cloud" style={{ top: '18%', width: '38vw', animationDuration: '0.7s' }} />
            <span className="cloud" style={{ top: '34%', width: '24vw', animationDuration: '1s', animationDelay: '-0.4s' }} />
            <span className="cloud" style={{ top: '70%', width: '46vw', animationDuration: '0.8s', animationDelay: '-0.2s' }} />
            <span className="cloud" style={{ top: '82%', width: '20vw', animationDuration: '1.1s', animationDelay: '-0.7s' }} />
            <div aria-hidden className="retro-sun absolute -bottom-[22vmin] left-1/2 h-[60vmin] w-[60vmin] -translate-x-1/2 opacity-90" />

            <motion.p className="kicker relative text-cream" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05, duration: 0.2 }}>
              Now flying to
            </motion.p>
            <motion.p className="sign relative mb-2 mt-1 text-6xl text-cream sm:text-8xl" initial={{ y: 16, opacity: 0, scale: 0.94 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: 0.08, duration: 0.25, ease: 'easeOut' }}>
              {flight.name}
            </motion.p>
            <div className="relative">
              <Arc code={flight.code} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </FlightContext.Provider>
  );
}
