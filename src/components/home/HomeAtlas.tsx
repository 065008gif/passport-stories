'use client';

/**
 * Sections 1 and 2 of the home page, sharing one piece of state: the country
 * a visitor picked in the hero. Picking a postcard scrolls down to the globe,
 * which turns to that country and the slider centres its card.
 */
import { useCallback, useState } from 'react';
import CultureHero from '@/components/home/CultureHero';
import GlobeExplorer, { type ExploreCountry } from '@/components/home/GlobeExplorer';
import { track } from '@/lib/analytics';

export default function HomeAtlas({ countries, startIndex }: { countries: ExploreCountry[]; startIndex: number }) {
  // `n` changes on every pick, so picking the same country twice still turns the globe.
  const [request, setRequest] = useState<{ slug: string; n: number } | null>(null);

  const pickFromHero = useCallback((slug: string) => {
    track('hero_country_picked', { country: slug });
    setRequest((r) => ({ slug, n: (r?.n ?? 0) + 1 }));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('explore')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <CultureHero onPick={pickFromHero} />

      <section id="explore" className="explore-section relative scroll-mt-[var(--header)] pb-16 pt-10 sm:pb-24 sm:pt-14" aria-labelledby="explore-title">
        <div className="container-x">
          <GlobeExplorer countries={countries} startIndex={startIndex} request={request} />
        </div>
      </section>
    </>
  );
}
