import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Poster } from '@/components/Visuals';
import StoryCard from '@/components/culture/StoryCard';
import { SERIES, STORIES } from '@/data/journal';

export const metadata: Metadata = {
  title: 'Culture Journal',
  description: 'Longer stories about everyday life around the world: lesser-known traditions, a day in someone else’s life, food habits, work cultures and childhood.',
  alternates: { canonical: '/journal' },
};

export default function JournalPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <Poster code="J" />
        <div className="container-x relative pb-16 pt-2">
          <Breadcrumbs items={[{ label: 'Culture Journal' }]} />
          <p className="kicker mt-6 text-sun" data-rv="up">
            The Culture Journal · stories, not statistics
          </p>
          <h1 className="chunk mt-2 max-w-3xl text-5xl sm:text-7xl" data-rv="up" style={{ ['--d' as string]: '60ms' }}>
            Ordinary life, <em className="text-coral">told well.</em>
          </h1>
          <p className="mt-3 max-w-xl text-lg text-cream/90" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
            What makes a practice interesting, why it exists, and what we can learn from it. Short reads, with sources.
          </p>
        </div>
      </section>
      <div className="deck py-12">
        <div className="container-x">
          <ul className="grid gap-6 md:grid-cols-3">
            {STORIES.map((s, i) => (
              <li key={s.slug} data-rv="pop" style={{ ['--d' as string]: `${i * 90}ms` }}>
                <StoryCard story={s} big={i === 0} />
              </li>
            ))}
          </ul>

          <h2 className="chunk mt-16 text-3xl sm:text-4xl">Our series</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERIES.map((s, i) => {
              const count = STORIES.filter((st) => st.series === s.slug).length;
              return (
                <li key={s.slug} className="rounded-2xl border-2 border-cream/20 bg-paper p-4">
                  <p className="h-display text-xl">
                    <span className="mr-2 font-sans text-sm font-extrabold text-coral">{String(i + 1).padStart(2, '0')}</span>
                    {s.name}
                  </p>
                  <p className="mt-1 text-sm text-cream/75">{s.blurb}</p>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-cream/55">{count ? `${count} ${count === 1 ? 'story' : 'stories'}` : 'Coming soon'}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
