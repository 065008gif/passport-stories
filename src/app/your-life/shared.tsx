import { COUNTRIES } from '@/data/countries';
import type { LifeCountry } from '@/lib/yourLife';
import Breadcrumbs, { type Crumb } from '@/components/Breadcrumbs';
import YourLifeClient from '@/components/life/YourLifeClient';
import { Poster } from '@/components/Visuals';

/** Only the fields the calculator needs are sent to the browser. */
const lifeCountries: LifeCountry[] = COUNTRIES.map(({ slug, name, flag, airport, life, metrics }) => ({ slug, name, flag, airport, life, metrics }));

/** Shared layout for /your-life and /your-life/<country>. */
export function YourLifeView({ slug, crumbs, heading }: { slug?: string; crumbs: Crumb[]; heading: React.ReactNode }) {
  return (
    <>
    <section className="relative overflow-hidden">
      <Poster code="YOU" />
      <div className="container-x relative pb-16 pt-2">
        <Breadcrumbs items={crumbs} />
        <p className="kicker mt-6 text-sun">Your Life in Another Country</p>
        <h1 className="chunk mt-2 max-w-3xl text-4xl sm:text-6xl">{heading}</h1>
        <p className="mt-3 max-w-xl text-lg text-cream/90">
          Five numbers about your life now. One boarding pass showing what they could look like somewhere else.
        </p>
      </div>
    </section>
    <div className="deck py-12">
      <div className="container-x">
        <YourLifeClient countries={lifeCountries} slug={slug} />
      </div>
    </div>
    </>
  );
}
