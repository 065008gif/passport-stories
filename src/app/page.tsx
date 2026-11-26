import { COUNTRIES, INDIA } from '@/data/countries';
import { PLACES, formatArea } from '@/data/places';
import HomeAtlas from '@/components/home/HomeAtlas';
import type { ExploreCountry } from '@/components/home/GlobeExplorer';
import BoardingGates from '@/components/home/BoardingGates';
import Reels from '@/components/home/Reels';

/**
 * HOME (v12)
 *  1. Hero: a 3D world diorama of floating culture islands and a hero scale
 *     plane that flies the scroll; picking an island flies you to the globe.
 *  2. Explore: the original v8 globe in an observatory frame, a flat map, an
 *     always visible country card and a slider, all kept in step (HomeAtlas).
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
      language: c.quickFacts.language,
      workHours: c.metrics.workHours.value,
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
