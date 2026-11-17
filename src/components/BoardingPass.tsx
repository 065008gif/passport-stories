import type { CSSProperties, ReactNode } from 'react';

/** Dotted flight arc with a small plane, used between two airport codes. */
export function FlightArc({ className = '', color = '#FB8500', dot = '#1B1F5E' }: { className?: string; color?: string; dot?: string }) {
  return (
    <svg viewBox="0 0 200 60" className={className} aria-hidden>
      <path d="M8 50 Q100 -18 192 50" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeDasharray="1 9" />
      <circle cx="8" cy="50" r="5" fill={dot} />
      <circle cx="192" cy="50" r="5" fill={dot} />
      <text x="100" y="24" fontSize="24" textAnchor="middle" fill={color}>
        ✈
      </text>
    </svg>
  );
}

export interface PassRow {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}

/**
 * The boarding pass card: the site's signature way of showing a result or
 * a featured destination.
 *
 * `notch` must match the colour of whatever is behind the card so the
 * punched holes on the perforation look real.
 */
const TILES = ['#FFB703', '#4CC9F0', '#B693FF', '#06A77D', '#FB8500', '#7BDCF7'];

export default function BoardingPass({
  from,
  to,
  kicker = 'Boarding pass',
  rows,
  children,
  notch = '#0D0F3A',
  className = '',
}: {
  from: { code: string; label: string };
  to: { code: string; label: string };
  kicker?: string;
  rows?: PassRow[];
  children?: ReactNode;
  notch?: string;
  className?: string;
}) {
  return (
    <article className={`bright-pass relative overflow-hidden rounded-[28px] border-[3px] border-ink text-ink ${className}`} style={{ '--notch': notch } as CSSProperties}>
      <header className="flex items-center justify-between gap-4 bg-ink px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-sun sm:px-8">
        <span>{kicker}</span>
        <span className="text-cream">Passport Stories</span>
      </header>

      {/* Route: bright sunset band */}
      <div className="bright-pass-route flex items-end justify-between gap-2 px-5 pb-5 pt-6 sm:px-8">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink/70">From</p>
          <p className="chunk text-4xl leading-none sm:text-7xl">{from.code}</p>
          <p className="mt-1 truncate text-sm font-bold text-ink/80">{from.label}</p>
        </div>
        <FlightArc className="mb-6 min-w-0 flex-1" color="#1B1F5E" dot="#1B1F5E" />
        <div className="min-w-0 text-right">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink/70">To</p>
          <p className="chunk text-4xl leading-none sm:text-7xl">{to.code}</p>
          <p className="mt-1 truncate text-sm font-bold text-ink/80">{to.label}</p>
        </div>
      </div>

      {rows && (
        <dl className="grid grid-cols-2 gap-2 border-y-[3px] border-ink bg-ink p-3 sm:grid-cols-3 sm:gap-3 sm:p-5">
          {rows.map((r, i) => (
            <div key={r.label} className="rounded-2xl border-2 border-ink p-2.5 sm:p-3.5 text-ink shadow-[0_4px_0_rgba(0,0,0,.35)]" style={{ background: TILES[i % TILES.length] }}>
              <dt className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/75">{r.label}</dt>
              <dd className="chunk mt-1 text-lg leading-tight sm:text-[28px]">{r.value}</dd>
              {r.note && <dd className="mt-1 text-[13px] font-semibold leading-snug text-ink/75">{r.note}</dd>}
            </div>
          ))}
        </dl>
      )}

      {children && <div className="bright-pass-stub px-5 py-5 sm:px-8">{children}</div>}
    </article>
  );
}
