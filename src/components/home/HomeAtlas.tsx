'use client';

/**
 * Sections 1 and 2 of the home page, sharing one piece of state: the country
 * a visitor picked in the hero. Picking a postcard scrolls down to the globe,
 * which turns to that country and the slider centres its card.
 */
import { useCallback, useState } from 'react';
import HeroCollage from '@/components/home/HeroCollage';
import GlobeExplorer, { type ExploreCountry } from '@/components/home/GlobeExplorer';
import { track } from '@/lib/analytics';

export default function HomeAtlas({ countries, startIndex }: { countries: ExploreCountry[]; startIndex: number }) {
  // `n` changes on every pick, so picking the same country twice still turns the globe.
  const [request, setRequest] = useState<{ slug: string; n: number } | null>(null);

  const names = Object.fromEntries(countries.map((c) => [c.slug, c.name]));

  const pickFromHero = useCallback((slug: string) => {
    track('hero_country_picked', { country: slug });
    setRequest((r) => ({ slug, n: (r?.n ?? 0) + 1 }));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('explore')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <HeroCollage
        names={names}
        onPick={pickFromHero}
        headline="Same planet. Different lives."
        tagline="Step into the streets, festivals, kitchens and everyday moments of twenty countries."
      />

      <section id="explore" className="explore-section relative scroll-mt-[var(--header)] pb-16 pt-10 sm:pb-24 sm:pt-14" aria-labelledby="explore-title">
        <div className="container-x">
          <GlobeExplorer countries={countries} startIndex={startIndex} request={request} />
        </div>
      </section>
    </>
  );
}
