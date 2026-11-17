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
    <form className="flex flex-wrap items-end gap-3 sm:flex-nowrap" onSubmit={(e) => e.preventDefault()} aria-label="Choose two countries to compare">
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
        className="mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sun text-2xl font-bold text-ink shadow-[0_4px_0_#fb8500] transition-transform duration-500 hover:scale-110"
      >
        ⇄
      </button>
      <CountryPicker label="Country B" name="compare-b" options={options} value={b} disabled={[a]} onChange={(v) => go(a, v)} />
    </form>
  );
}
