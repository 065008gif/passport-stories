/**
 * Country page: everyday life, festivals, social customs and lesser-known
 * facts, for the countries that have Culture Map content.
 */
import type { CultureProfile, CultureItem } from '@/data/culture';
import type { Source } from '@/data/types';
import { PiaSays } from '@/components/Pia';

export function SourceLink({ source, className = '' }: { source: Source; className?: string }) {
  if (!source.url) return <span className={`text-xs text-cream/60 ${className}`}>Source: {source.label}</span>;
  return (
    <a href={source.url} target="_blank" rel="noopener noreferrer" className={`text-xs font-semibold text-cream/60 underline decoration-dotted underline-offset-2 hover:text-coral ${className}`}>
      Source: {source.label} ↗
    </a>
  );
}

function Cards({ items, tone }: { items: CultureItem[]; tone: string }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {items.map((it, i) => (
        <li key={it.title} data-rv="pop" style={{ ['--d' as string]: `${i * 90}ms` }} className="flex flex-col rounded-3xl border-2 border-ink bg-paper p-5 shadow-[0_6px_0_#24123D] transition-transform hover:-translate-y-1 hover:rotate-[-0.5deg]">
          <span aria-hidden className="mb-3 block h-2 w-12 rounded-full" style={{ background: tone }} />
          <h4 className="h-display text-2xl text-ink">{it.title}</h4>
          <p className="mt-2 flex-1 leading-relaxed text-ink/85">{it.text}</p>
          <SourceLink source={it.source} className="mt-3 !text-ink/55" />
        </li>
      ))}
    </ul>
  );
}

export default function CultureBlock({ culture, name }: { culture: CultureProfile; name: string }) {
  return (
    <section id="culture" className="relative scroll-mt-36 overflow-hidden border-b-2 border-dashed border-cream/15 py-16 sm:py-20" aria-labelledby="culture-title" data-section="culture">
      <div className="container-x relative">
        <p className="kicker text-sun">Culture &amp; customs · {name}</p>
        <h2 id="culture-title" className="h-display mt-3 max-w-3xl text-3xl sm:text-5xl">
          {culture.question}
        </h2>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl bg-sky p-6 sm:p-8" data-rv="left">
            <p className="kicker text-sun">Everyday life</p>
            <p className="mt-3 text-lg leading-relaxed sm:text-xl">{culture.everyday.text}</p>
            <SourceLink source={culture.everyday.source} className="mt-4 inline-block" />
          </div>
          <PiaSays size={76} className="justify-center lg:justify-start" wave>
            Little things say a lot. Spot one custom here that is like home, and one that is totally new to you.
          </PiaSays>
        </div>

        <h3 className="chunk mt-12 text-2xl sm:text-3xl">Festivals &amp; celebrations</h3>
        <div className="mt-4">
          <Cards items={culture.festivals} tone="#FF4F7B" />
        </div>

        <h3 className="chunk mt-12 text-2xl sm:text-3xl">Social customs</h3>
        <p className="mt-1 text-cream/75">Greetings, etiquette and the unwritten rules.</p>
        <div className="mt-4">
          <Cards items={culture.customs} tone="#6C4CF5" />
        </div>

        <h3 className="chunk mt-12 text-2xl sm:text-3xl">Lesser-known facts</h3>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {culture.facts.map((f, i) => (
            <li key={f.title} data-rv="up" style={{ ['--d' as string]: `${i * 90}ms` }} className="rounded-3xl bg-sun p-5 text-ink shadow-[0_6px_0_#FF7A1A] sm:p-6">
              <p className="kicker">Did you know? · {f.category}</p>
              <h4 className="h-display mt-2 text-2xl">{f.title}</h4>
              <p className="mt-2 leading-relaxed">{f.text}</p>
              <SourceLink source={f.source} className="mt-3 inline-block !text-ink/65" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
