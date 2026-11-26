'use client';

/** Two flag pickers and a swap button that navigate to /compare/a-vs-b. */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CountryPicker, { type PickOption } from '@/components/CountryPicker';

export default function ComparePicker({ options, a, b }: { options: PickOption[]; a: string; b: string }) {
  const router = useRouter();
  const [turns, setTurns] = useState(0);
  const go = (x: string, y: string) => {
    if (x !== y) router.push(`/compare/${x}-vs-${y}`, { scroll: false });
  };
  return (
    <form className="flex flex-col gap-1 sm:flex-row sm:items-end sm:gap-3" onSubmit={(e) => e.preventDefault()} aria-label="Choose two countries to compare">
      <CountryPicker label="Country A" name="compare-a" options={options} value={a} disabled={[b]} onChange={(v) => go(v, b)} />
      <button
        type="button"
        onClick={() => {
          setTurns((t) => t + 1);
          go(b, a);
        }}
        aria-label="Swap the two countries"
        data-track="compare-swap"
        style={{ transform: `rotate(${turns * 180}deg)` }}
        className="mx-auto -my-1 flex h-11 w-11 shrink-0 sm:my-0 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-sun text-2xl font-bold text-ink shadow-[0_4px_0_#FF7A1A] transition-transform duration-500 hover:scale-110"
      >
        <span className="sm:hidden">⇅</span>
        <span className="hidden sm:inline">⇄</span>
      </button>
      <CountryPicker label="Country B" name="compare-b" options={options} value={b} disabled={[a]} onChange={(v) => go(a, v)} />
    </form>
  );
}
