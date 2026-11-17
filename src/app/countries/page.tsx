import type { Metadata } from 'next';
import { COUNTRIES, REGIONS } from '@/data/countries';
import { METRICS, formatMetric } from '@/data/topics';
import type { MetricKey } from '@/data/types';
import Breadcrumbs from '@/components/Breadcrumbs';
import { TeleportButton } from '@/components/Bits';
import { Poster } from '@/components/Visuals';
import CountryGrid, { type SortOption } from '@/components/countries/CountryGrid';

export const metadata: Metadata = {
  title: 'Countries',
  description: 'All 20 countries on Passport Stories. Filter by region, rank them by working hours, wedding size or dinner time, and pick one to visit.',
};

const SORT_KEYS: [MetricKey, string, string][] = [
  ['workHours', 'Longest work week', '💼'],
  ['paidLeave', 'Most paid holidays', '🏖️'],
  ['weddingGuests', 'Biggest weddings', '💍'],
  ['dinnerTime', 'Latest dinner', '🍽️'],
  ['commuteMinutes', 'Longest commute', '🚆'],
  ['householdSize', 'Fullest homes', '🏠'],
];

export default function CountriesPage() {
  const sorts: SortOption[] = [{ key: 'az', label: 'A to Z', emoji: '🔤' }, ...SORT_KEYS.map(([key, label, emoji]) => ({ key, label, emoji }))];
  const countries = COUNTRIES.map((c) => ({
    slug: c.slug,
    name: c.name,
    airport: c.airport,
    region: c.region,
    tagline: c.tagline,
    fact: c.facts[0],
    stats: Object.fromEntries(SORT_KEYS.map(([k]) => [k, [c.metrics[k].value, formatMetric(k, c.metrics[k].value)]])) as Record<string, [number, string]>,
  }));

  return (
    <>
      <section className="relative overflow-hidden">
        <Poster code="20" />
        <div className="container-x relative pb-24 pt-2">
          <Breadcrumbs items={[{ label: 'Countries' }]} />
          <p className="kicker mt-6 text-sun" data-rv="up">
            Departures · 20 gates open
          </p>
          <h1 className="chunk mt-2 text-5xl sm:text-7xl" data-rv="up" style={{ ['--d' as string]: '60ms' }}>
            Where to <span className="text-sun">next?</span>
          </h1>
          <p className="mt-3 max-w-xl text-lg text-cream/90" data-rv="up" style={{ ['--d' as string]: '120ms' }}>
            Twenty countries, the same six questions. Filter them, rank them by who works longest or eats latest, or let the dice decide.
          </p>
          <div className="mt-6" data-rv="up" style={{ ['--d' as string]: '180ms' }}>
            <TeleportButton className="btn btn-sun" label="Roll the dice" countries={COUNTRIES.map(({ slug, name, airport }) => ({ slug, name, airport }))} />
          </div>
        </div>
      </section>

      <div className="deck pb-16">
        <div className="container-x">
          <CountryGrid countries={countries} regions={[...REGIONS]} sorts={sorts} />
          <p className="mt-10 text-sm text-cream/70">
            Rankings use the figures on each country page: official statistics where they exist, and estimates marked est. where they do not. {METRICS.workHours.label} and the rest are explained on the About page.
          </p>
        </div>
      </div>
    </>
  );
}
