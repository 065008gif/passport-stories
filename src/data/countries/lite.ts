import type { Country } from '../types';

/**
 * A slim version of a country for interactive (browser) components such as
 * the globe and search. Server pages build these and pass them down as props
 * so the full content files are not shipped to every visitor.
 */
export interface CountryLite {
  slug: string;
  name: string;
  isoNumeric: string;
  flag: string;
  airport: string;
  region: string;
  tagline: string;
  geo: { lat: number; lng: number };
  accent: string;
}

const ACCENTS = ['#FFC233', '#FF8A4C', '#FF6B5B'];

export const toLite = (c: Country, i: number): CountryLite => ({
  slug: c.slug,
  name: c.name,
  isoNumeric: c.isoNumeric,
  flag: c.flag,
  airport: c.airport,
  region: c.region,
  tagline: c.tagline,
  geo: c.geo,
  accent: ACCENTS[i % ACCENTS.length],
});
