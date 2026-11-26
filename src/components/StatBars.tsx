'use client';

/**
 * Animated stat bars. `DuelBar` compares two countries on one metric and is
 * used by the Compare tool and the "Compared with India" boxes.
 */
import { motion } from 'framer-motion';
import { CountUp } from './Fx';

export interface BarSide {
  name: string;
  value: number;
  display: string;
  isSample: boolean;
}

function Bar({ side, max, color, delay }: { side: BarSide; max: number; color: string; delay: number }) {
  const width = Math.max(6, (side.value / max) * 100);
  return (
    <div className="grid grid-cols-[4.5rem_1fr] sm:grid-cols-[7rem_1fr] items-center gap-3">
      <span className="truncate text-sm font-semibold">{side.name}</span>
      <div className="flex items-center gap-2">
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-cream/10">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: '0%' }}
            whileInView={{ width: `${width}%` }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.9, delay, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </div>
        <span className="w-36 shrink-0 whitespace-nowrap text-right font-mono text-sm font-medium">
          <CountUp text={side.display} />
          {side.isSample && <span className="sample-tag" title="Editorial estimate: no official statistic yet">est.</span>}
        </span>
      </div>
    </div>
  );
}

export function DuelBar({ label, a, b, highlight = false }: { label: string; a: BarSide; b: BarSide; highlight?: boolean }) {
  const max = Math.max(a.value, b.value, 0.0001);
  return (
    <div className={`h-full rounded-3xl p-5 shadow-[0_6px_0_rgba(0,0,0,.35)] ${highlight ? 'bg-ink ring-4 ring-tang' : 'bg-ink'}`}>
      <p className="mb-3 flex items-center justify-between gap-2 text-sm font-bold">
        {label}
        {highlight && <span className="rounded-full bg-tang px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink">Big difference</span>}
      </p>
      <div className="space-y-2">
        <Bar side={a} max={max} color="#6C4CF5" delay={0} />
        <Bar side={b} max={max} color="#FFB703" delay={0.12} />
      </div>
    </div>
  );
}
