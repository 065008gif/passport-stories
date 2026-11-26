import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumbs from '@/components/Breadcrumbs';
import Flag from '@/components/Flag';
import StoryCard from '@/components/culture/StoryCard';
import { STORIES, getStory, seriesName } from '@/data/journal';
import { getCountry } from '@/data/countries';

type Props = { params: Promise<{ slug: string }> };

export const generateStaticParams = () => STORIES.map((s) => ({ slug: s.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = getStory((await params).slug);
  if (!s) return {};
  return { title: s.title, description: s.dek, alternates: { canonical: `/journal/${s.slug}` } };
}

export default async function StoryPage({ params }: Props) {
  const s = getStory((await params).slug);
  if (!s) notFound();
  const more = STORIES.filter((x) => x.slug !== s.slug).slice(0, 2);
  return (
    <article className="deck pb-20">
      <header className="relative overflow-hidden" style={{ background: `linear-gradient(140deg, ${s.accent}, #6C4CF5)` }}>
        <div className="container-x relative pb-14 pt-2 text-white">
          <div className="[&_a]:text-white/80 [&_li]:text-white/80">
            <Breadcrumbs items={[{ label: 'Culture Journal', href: '/journal' }, { label: seriesName(s.series) }]} />
          </div>
          <p className="mt-8 inline-block rounded-full bg-white px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-ink">{seriesName(s.series)}</p>
          <h1 className="h-display mt-4 max-w-4xl text-4xl leading-[1.05] sm:text-6xl" data-rv="up">
            {s.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90 sm:text-xl">{s.dek}</p>
          <p className="mt-6 flex items-center gap-2 text-sm font-bold text-white/85">
            {s.countries.map((c) => (
              <Flag key={c} slug={c} size={26} />
            ))}
            <span className="ml-1">{s.minutes} min read</span>
          </p>
        </div>
      </header>

      <div className="container-x mt-12 grid gap-12 lg:grid-cols-[1fr_18rem]">
        <div className="max-w-2xl text-lg leading-relaxed text-cream/90">
          {s.body.map((p) =>
            p.startsWith('## ') ? (
              <h2 key={p} className="h-display mt-10 text-3xl text-cream">
                {p.slice(3)}
              </h2>
            ) : (
              <p key={p.slice(0, 30)} className="mt-5 first:mt-0">
                {p}
              </p>
            ),
          )}
          <aside className="mt-10 rounded-3xl bg-sun p-6 text-ink shadow-[0_6px_0_#FF7A1A]">
            <p className="kicker">What we can learn</p>
            <p className="h-display mt-2 text-2xl">{s.takeaway}</p>
          </aside>
          <section className="mt-10 border-t-2 border-dashed border-cream/20 pt-6" aria-label="Sources">
            <p className="kicker text-cream/70">Sources</p>
            <ul className="mt-2 space-y-1 text-sm">
              {s.sources.map((src) => (
                <li key={src.label}>
                  {src.url ? (
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-coral">
                      {src.label} ↗
                    </a>
                  ) : (
                    src.label
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          <p className="kicker text-cream/70">Explore the countries</p>
          {s.countries.map((c) => {
            const country = getCountry(c);
            if (!country) return null;
            return (
              <Link key={c} href={`/countries/${c}#culture`} className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-paper p-3 font-bold text-ink shadow-[0_4px_0_#24123D] hover:-translate-y-0.5">
                <Flag slug={c} size={34} /> {country.name} →
              </Link>
            );
          })}
        </aside>
      </div>

      {more.length > 0 && (
        <div className="container-x mt-16">
          <h2 className="chunk text-3xl">Keep reading</h2>
          <ul className="mt-5 grid gap-6 md:grid-cols-2">
            {more.map((m) => (
              <li key={m.slug}>
                <StoryCard story={m} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
