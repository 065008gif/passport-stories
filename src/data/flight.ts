import type { MetricKey } from './types';

/**
 * The flight on the home page.
 *
 * The plane starts in India and makes one hop per scroll. Each stop shows
 * the country's name, one surprising fact (the first entry in that
 * country's `facts`) and one number compared with India.
 *
 * Keep it to five or six stops: the home page is meant to take under a minute.
 */
export interface FlightStop {
  /** Country slug */
  slug: string;
  /** City shown on the route, for flavour. */
  city: string;
  /** The number shown at this stop, next to India's. */
  metric: MetricKey;
}

export const FLIGHT: FlightStop[] = [
  { slug: 'japan', city: 'Tokyo', metric: 'householdSize' },
  { slug: 'usa', city: 'New York', metric: 'paidLeave' },
  { slug: 'brazil', city: 'São Paulo', metric: 'schoolDayHours' },
  { slug: 'germany', city: 'Frankfurt', metric: 'workHours' },
  { slug: 'finland', city: 'Helsinki', metric: 'schoolStartAge' },
];
