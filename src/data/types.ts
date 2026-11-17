/**
 * The content schema for Passport Stories.
 *
 * Every country file in src/data/countries/ exports one `Country` object.
 * Components only ever read these types, so the team can edit content
 * without touching any component code.
 */

export type TopicSlug =
  | 'work-life-balance'
  | 'school-day'
  | 'weddings'
  | 'food'
  | 'housing'
  | 'transport';

export type MetricKey =
  | 'workHours'
  | 'paidLeave'
  | 'schoolStartAge'
  | 'schoolDayHours'
  | 'weddingDays'
  | 'weddingGuests'
  | 'dinnerTime'
  | 'householdSize'
  | 'homeOwnership'
  | 'commuteMinutes'
  | 'publicTransportShare';

export type Region = 'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Oceania';

export interface Source {
  label: string;
  url?: string;
}

/**
 * A single number shown on the site.
 * `isSample: true` means the value is a placeholder that has NOT been
 * verified. The UI marks these with a "sample" tag. Replace with `v(...)`
 * from helpers.ts once a figure is checked against a real source.
 */
export interface Stat {
  value: number;
  /** True for editorial estimates with no official source (shown as "est."). */
  isSample: boolean;
  source?: string;
  url?: string;
  /** 'live' = pulled from a public API on the last deploy. */
  kind?: 'live' | 'verified' | 'estimate';
}

export interface TopicContent {
  headline: string;
  /** One or two sentences. Shown on the country page, compare tool and tours. */
  summary: string;
  /** Optional longer paragraphs for the topic page (rich countries). */
  story?: string[];
  /** Short, concrete observations. */
  highlights: string[];
  /** Text for the "Compared with India" box. */
  vsIndia: string;
  /** Food topic only: the must-try dish. */
  mustTry?: string;
  sources: Source[];
}

export interface LifeData {
  currencyCode: string;
  currencySymbol: string;
  /** Units of local currency per 1 Indian rupee. */
  perINR: Stat;
  /** Cost of living index where India = 100. */
  costIndex: Stat;
  /** Typical rent as a percentage of take-home pay. */
  rentShare: Stat;
  /** One line: "what your weekend could look like". */
  weekend: string;
}

export interface Country {
  slug: string;
  name: string;
  /** ISO 3166-1 numeric code as a 3-character string; links the map shape. */
  isoNumeric: string;
  flag: string;
  /** Main international airport code, used as the country's "ticket code". */
  airport: string;
  region: Region;
  tagline: string;
  /** Map position of the marker and camera target. */
  geo: { lat: number; lng: number };
  quickFacts: { population: string; capital: string; currency: string; language: string };
  metrics: Record<MetricKey, Stat>;
  life: LifeData;
  topics: Record<TopicSlug, TopicContent>;
  /** "Did you know?" cards. */
  facts: string[];
  /** Quiz clues, hardest first. */
  quizClues: [string, string, string];
  sources: Source[];
  /** True when the copy is full-length (India, Japan, Germany at launch). */
  isRich?: boolean;
}
