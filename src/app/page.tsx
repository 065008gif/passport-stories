import { COUNTRIES, INDIA } from '@/data/countries';
import { PLACES, formatArea } from '@/data/places';
import HomeAtlas from '@/components/home/HomeAtlas';
import type { ExploreCountry } from '@/components/home/GlobeExplorer';
import BoardingGates from '@/components/home/BoardingGates';
import Reels from '@/components/home/Reels';

/**
 * HOME (v11)
 *  1. Hero: a living postcard portal. Real places float on three depth
 *     planes over a sunlit wash; picking one flies you to it on the globe.
 *  2. Explore: the globe and flat map, hover facts and a country slider,
 *     all kept in step with the hero (see HomeAtlas).
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
      <HomeAtlas countries={countries} startIndex={COUNTRIES.indexOf(INDIA)} />

      <div className="relative z-10 bg-night">
        <BoardingGates />
        <Reels />
      </div>
    </>
  );
}
