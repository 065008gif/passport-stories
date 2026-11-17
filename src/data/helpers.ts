import type { Source, Stat } from './types';

/** A SAMPLE value: a placeholder that has not been verified yet. */
export const s = (value: number): Stat => ({ value, isSample: true });

/** A VERIFIED value. Use once the figure is checked: v(34.3, 'OECD 2024'). */
export const v = (value: number, source: string): Stat => ({ value, isSample: false, source });

/** Source note attached to draft copy until the team verifies it. */
export const DRAFT: Source[] = [
  { label: 'Passport Stories editorial draft (sample copy, to be verified by the team)' },
];

/** Sources the team plans to replace the sample figures with. */
export const PLANNED_SOURCES: Source[] = [
  { label: 'World Bank Open Data', url: 'https://data.worldbank.org/' },
  { label: 'OECD Data Explorer', url: 'https://data-explorer.oecd.org/' },
  { label: 'ILOSTAT (International Labour Organization)', url: 'https://ilostat.ilo.org/' },
  { label: 'UNESCO Institute for Statistics', url: 'https://uis.unesco.org/' },
  { label: 'Numbeo cost of living index', url: 'https://www.numbeo.com/cost-of-living/' },
];

/** Country-level sources: draft note plus the planned data sources. */
export const COUNTRY_SOURCES: Source[] = [...DRAFT, ...PLANNED_SOURCES];

/**
 * Shortcut for a topic entry in the shorter country files.
 * topic(headline, summary, highlights, vsIndia, mustTry?)
 * Add a `story` array by hand (see india.ts) to turn it into a full spread.
 */
export const topic = (
  headline: string,
  summary: string,
  highlights: string[],
  vsIndia: string,
  mustTry?: string,
) => ({ headline, summary, highlights, vsIndia, ...(mustTry ? { mustTry } : {}), sources: DRAFT });
