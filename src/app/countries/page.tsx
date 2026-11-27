import type { Metadata } from 'next';
import { COUNTRIES, REGIONS } from '@/data/countries';
import { METRICS, formatMetric } from '@/data/topics';
import type { MetricKey } from '@/data/types';
import Breadcrumbs from '@/components/Breadcrumbs';
import { TeleportButton } from '@/components/Bits';
import CountryDirectory from '@/components/countries/CountryDirectory';
import type { SortOption } from '@/components/countries/CountryGrid';

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
    fact: c.facts[1] ?? c.facts[0],
    weekend: c.life.weekend,
    capital: c.quickFacts.capital,
    stats: Object.fromEntries(SORT_KEYS.map(([k]) => [k, [c.metrics[k].value, formatMetric(k, c.metrics[k].value)]])) as Record<string, [number, string]>,
  }));

  return (
    <div className="wx-page">
      <div className="container-x pb-14 pt-2">
        <Breadcrumbs items={[{ label: 'Countries' }]} />
        <div className="wx-head">
          <div>
            <p className="kicker text-sun">Departures · 20 gates open</p>
            <h1 className="chunk mt-1 text-4xl sm:text-5xl">
              Where to <span className="text-sun">next?</span>
            </h1>
          </div>
          <TeleportButton className="btn btn-sun" label="Roll the dice" countries={COUNTRIES.map(({ slug, name, airport }) => ({ slug, name, airport }))} />
        </div>
        <CountryDirectory countries={countries} regions={[...REGIONS]} sorts={sorts} />
        <p className="mt-8 text-sm text-cream/70">
          Rankings use the figures on each country page: official statistics where they exist, and estimates marked est. where they do not. {METRICS.workHours.label} and the rest are explained on the About page.
        </p>
      </div>
    </div>
  );
}
