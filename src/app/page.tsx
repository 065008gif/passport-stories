import { COUNTRIES, INDIA } from '@/data/countries';
import { PLACES, formatArea } from '@/data/places';
import HeroCollage from '@/components/home/HeroCollage';
import GlobeExplorer, { type ExploreCountry } from '@/components/home/GlobeExplorer';
import BoardingGates from '@/components/home/BoardingGates';
import Reels from '@/components/home/Reels';

/**
 * HOME (v10)
 *  1. Hero: real places from many countries in one moving, layered picture.
 *  2. Explore: the v8 globe, brighter, with zoom, hover facts, a country
 *     slider and a flat map toggle.
 *  3. Your turn to take off (unchanged)
 *  4. Latest reels (unchanged)
 *  5. Footer (in the layout, unchanged)
 */
export default function HomePage() {
  const countries: ExploreCountry[] = COUNTRIES.map((c) => {
    const p = PLACES[c.slug];
    return {
      slug: c.slug,
      name: c.name,
      region: c.region,
      lat: c.geo.lat,
      lng: c.geo.lng,
      capital: c.quickFacts.capital,
      population: c.quickFacts.population,
      area: formatArea(p.area),
      fact: p.fact,
      photo: p.photo,
      photoAlt: p.alt,
      spot: p.spot,
    };
  });

  return (
    <>
      <HeroCollage
        headline={
          <>
            Same planet. <span className="text-[#EE5541]">Different lives.</span>
          </>
        }
        tagline="Step into the streets, festivals, kitchens and everyday moments of twenty countries."
      />

      <section id="explore" className="explore-section relative scroll-mt-[var(--header)] py-16 sm:py-24" aria-labelledby="explore-title">
        <div className="container-x">
          <GlobeExplorer countries={countries} startIndex={COUNTRIES.indexOf(INDIA)} />
        </div>
      </section>

      <div className="relative z-10 bg-night">
        <BoardingGates />
        <Reels />
      </div>
    </>
  );
}
