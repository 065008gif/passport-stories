'use client';

/** Hero search bar: pick a country and a topic, then go. */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';

export default function ExploreBar({ countries, topics }: { countries: { slug: string; name: string }[]; topics: { slug: string; title: string }[] }) {
  const router = useRouter();
  const [country, setCountry] = useState('japan');
  const [topic, setTopic] = useState('culture');
  const go = (e: React.FormEvent) => {
    e.preventDefault();
    track('hero_explore', { country, topic });
    router.push(`/countries/${country}#${topic}`);
  };
  const field = 'flex min-w-0 flex-1 flex-col px-4 py-2.5 text-left sm:px-5';
  const label = 'text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/70';
  const select = 'mt-0.5 w-full cursor-pointer appearance-none bg-transparent text-[15px] font-bold text-white outline-none [&>option]:text-ink';
  return (
    <form onSubmit={go} className="explore-bar flex w-full flex-col overflow-hidden rounded-[1.6rem] border border-white/25 bg-white/15 backdrop-blur-xl sm:flex-row sm:items-stretch" aria-label="Explore a country">
      <label className={field}>
        <span className={label}>Where to?</span>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className={select}>
          {countries.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <span aria-hidden className="hidden w-px self-stretch bg-white/25 sm:block" />
      <label className={field}>
        <span className={label}>Through which lens?</span>
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className={select}>
          <option value="culture">Culture &amp; customs</option>
          {topics.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.title}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="m-1.5 rounded-[1.2rem] bg-white px-6 py-3 text-[15px] font-extrabold text-ink transition-transform hover:scale-[1.02] active:scale-[0.98]">
        Explore →
      </button>
    </form>
  );
}
