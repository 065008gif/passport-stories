import type { Metadata } from 'next';
import { COUNTRIES } from '@/data/countries';
import Breadcrumbs from '@/components/Breadcrumbs';
import CommunityFacts from '@/components/CommunityFacts';
import { Poster } from '@/components/Visuals';

export const metadata: Metadata = {
  title: 'Community facts',
  description: 'Interesting facts about everyday life around the world, sent in by Passport Stories visitors. Add yours.',
};

export default function FactsPage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <Poster code="!" />
        <div className="container-x relative pb-16 pt-2">
          <Breadcrumbs items={[{ label: 'Community' }]} />
          <p className="kicker mt-6 text-sun" data-rv="up">
            Community · written by you
          </p>
          <h1 className="chunk mt-2 max-w-3xl text-5xl sm:text-7xl" data-rv="up" style={{ ['--d' as string]: '60ms' }}>
            You&rsquo;ve been there. <span className="text-sun">Tell us.</span>
          </h1>
          <p className="mt-3 max-w-xl text-lg text-cream/90" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
            Our pages cover the big picture. The small, strange, true details come from people who have lived them. Send one fact; we check it and publish it within 24 hours.
          </p>
        </div>
      </section>
      <div className="deck py-12">
        <div className="container-x">
          <CommunityFacts countries={COUNTRIES.map(({ slug, name, airport }) => ({ slug, name, airport }))} heading={false} />
        </div>
      </div>
    </>
  );
}
