import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Poster } from '@/components/Visuals';
import FactWall from '@/components/culture/FactWall';
import { ALL_FACTS } from '@/data/culture';
import { getCountry } from '@/data/countries';

export const metadata: Metadata = {
  title: 'Did you know?',
  description: 'Short, surprising and sourced facts about traditions, food, school, work and celebrations around the world. Discover something new in 30 seconds.',
  alternates: { canonical: '/did-you-know' },
};

export default function DidYouKnowPage() {
  const facts = ALL_FACTS.map((f) => ({ title: f.title, text: f.text, category: f.category, country: f.country, countryName: getCountry(f.country)?.name || f.country, source: f.source }));
  return (
    <>
      <section className="relative overflow-hidden">
        <Poster code="?" />
        <div className="container-x relative pb-16 pt-2">
          <Breadcrumbs items={[{ label: 'Did you know?' }]} />
          <p className="kicker mt-6 text-sun" data-rv="up">
            Did you know? · 30-second discoveries
          </p>
          <h1 className="chunk mt-2 max-w-3xl text-5xl sm:text-7xl" data-rv="up" style={{ ['--d' as string]: '60ms' }}>
            Small facts, <em className="text-coral">big</em> surprises.
          </h1>
          <p className="mt-3 max-w-xl text-lg text-cream/90" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
            Unusual traditions, school habits, food rules and festivals. Each one is short, and each one links to where we found it.
          </p>
        </div>
      </section>
      <div className="deck py-12">
        <div className="container-x">
          <FactWall facts={facts} />
        </div>
      </div>
    </>
  );
}
