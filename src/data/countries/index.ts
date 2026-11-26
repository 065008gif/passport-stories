/**
 * The country registry. To add a country: copy an existing file in this
 * folder, edit it, then import it here and add it to COUNTRIES.
 */
import type { Country, MetricKey, Region } from '../types';
import { VERIFIED } from '../verified';
import LIVE from '../live.json';
import { weekNumber } from '@/lib/week';
import india from './india';
import japan from './japan';
import southKorea from './south-korea';
import china from './china';
import singapore from './singapore';
import uae from './uae';
import germany from './germany';
import france from './france';
import italy from './italy';
import unitedKingdom from './united-kingdom';
import netherlands from './netherlands';
import sweden from './sweden';
import finland from './finland';
import usa from './usa';
import canada from './canada';
import brazil from './brazil';
import mexico from './mexico';
import australia from './australia';
import southAfrica from './south-africa';
import egypt from './egypt';

const ALL: Country[] = [
  india, japan, southKorea, china, singapore, uae,
  germany, france, italy, unitedKingdom, netherlands, sweden, finland,
  usa, canada, brazil, mexico,
  australia, southAfrica, egypt,
];

/**
 * Swap the editorial estimates for checked figures (verified.ts) and for
 * the live API figures fetched on the last deploy (live.json).
 */
function applyData(c: Country): Country {
  const checked = VERIFIED[c.slug] || {};
  for (const [k, v] of Object.entries(checked)) {
    if (v) c.metrics[k as MetricKey] = { value: v.value, isSample: false, source: v.source, url: v.url, kind: 'verified' };
  }
  const age = (LIVE.schoolAge as Record<string, { value: number; year: string }>)[c.slug];
  if (age) c.metrics.schoolStartAge = { value: age.value, isSample: false, source: `UNESCO UIS via World Bank API, ${age.year}`, url: 'https://data.worldbank.org/indicator/SE.PRM.AGES', kind: 'live' };
  const fx = (LIVE.fx as Record<string, number>)[c.slug];
  if (fx) c.life.perINR = { value: fx, isSample: false, source: `ExchangeRate-API, ${LIVE.fxDate || ''}`.trim(), kind: 'live' };
  if (c.slug === 'india') c.life.perINR = { value: 1, isSample: false, kind: 'verified' };
  const cost = (LIVE.costIndex as Record<string, { value: number; year: string }>)[c.slug];
  if (cost) c.life.costIndex = { value: cost.value, isSample: false, source: `World Bank price level ratio (PA.NUS.PPPC.RF), ${cost.year}, India = 100`, url: 'https://data.worldbank.org/indicator/PA.NUS.PPPC.RF', kind: 'live' };
  return c;
}

export const COUNTRIES: Country[] = ALL.map(applyData);

/** When the live figures were last fetched (null = never; estimates shown). */
export const LIVE_FETCHED_AT: string | null = LIVE.fetchedAt;

export const HOME_SLUG = 'india';

export const REGIONS: Region[] = ['Asia', 'Europe', 'Americas', 'Africa', 'Oceania'];

const bySlug = new Map(COUNTRIES.map((c) => [c.slug, c]));
const byIso = new Map(COUNTRIES.map((c) => [c.isoNumeric, c]));

export const getCountry = (slug: string) => bySlug.get(slug);
export const getCountryByIso = (iso: string | number | undefined) =>
  iso === undefined ? undefined : byIso.get(String(iso).padStart(3, '0'));
export const INDIA = india;

/** Sunset accent colour for a country, cycled so neighbours differ. */
const ACCENTS = ['#FFC233', '#FF8A4C', '#FF6B5B'];
export const accentOf = (c: Country) => ACCENTS[COUNTRIES.indexOf(c) % ACCENTS.length];

/** Country of the Week: pinned in site.ts, or rotating weekly (never India). */
export function countryOfTheWeek(date: Date, pinned: string | null): Country {
  if (pinned && bySlug.has(pinned)) return bySlug.get(pinned)!;
  const pool = COUNTRIES.filter((c) => c.slug !== HOME_SLUG);
  return pool[weekNumber(date) % pool.length];
}

/** Compare URLs look like /compare/india-vs-germany. */
export const pairSlug = (a: string, b: string) => `${a}-vs-${b}`;
export function parsePair(pair: string): [Country, Country] | null {
  const [a, b] = pair.split('-vs-');
  const ca = bySlug.get(a);
  const cb = bySlug.get(b);
  return ca && cb && ca !== cb ? [ca, cb] : null;
}
