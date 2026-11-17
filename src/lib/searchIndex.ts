/**
 * Everything the search box can find. Loaded only when search is first
 * opened, so it does not slow down the first page load.
 */
import { COUNTRIES, HOME_SLUG, pairSlug } from '@/data/countries';
import { TOPICS } from '@/data/topics';
import { NAV } from '@/data/site';

export interface SearchItem {
  title: string;
  sub: string;
  href: string;
  kind: 'Country' | 'Topic' | 'Compare' | 'Page';
  keywords?: string;
}

export const SEARCH_ITEMS: SearchItem[] = [
  ...COUNTRIES.map<SearchItem>((c) => ({
    title: c.name,
    sub: c.tagline,
    href: `/countries/${c.slug}`,
    kind: 'Country',
    keywords: `${c.quickFacts.capital} ${c.airport} ${c.region}`,
  })),
  ...COUNTRIES.flatMap((c) =>
    TOPICS.map<SearchItem>((t) => ({
      title: `${c.name}: ${t.title}`,
      sub: c.topics[t.slug].headline,
      href: `/countries/${c.slug}#${t.slug}`,
      kind: 'Topic',
      keywords: t.blurb,
    })),
  ),
  ...COUNTRIES.filter((c) => c.slug !== HOME_SLUG).map<SearchItem>((c) => ({
    title: `India vs ${c.name}`,
    sub: 'Side-by-side comparison',
    href: `/compare/${pairSlug(HOME_SLUG, c.slug)}`,
    kind: 'Compare',
  })),
  ...NAV.map<SearchItem>((n) => ({ title: n.label, sub: 'Page', href: n.href, kind: 'Page' })),
  { title: 'Your Passport', sub: 'Stamps and badges you have collected', href: '/passport', kind: 'Page' },
  { title: 'Ask the Map', sub: 'Suggest a country or topic', href: '/ask', kind: 'Page' },
  { title: 'About & Sources', sub: 'Who made this and where the data comes from', href: '/about', kind: 'Page' },
];

/** Shown before the visitor types anything. */
export const SEARCH_DEFAULTS = SEARCH_ITEMS.filter((i) =>
  ['/countries/japan', '/compare/india-vs-germany', '/your-life', '/quiz', '/passport'].includes(i.href),
);
