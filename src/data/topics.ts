import type { MetricKey, TopicSlug } from './types';

export interface MetricDef {
  key: MetricKey;
  label: string;
  short: string;
  unit: string;
  topic: TopicSlug;
  /** Where the verified figure should come from. */
  plannedSource: string;
}

export interface TopicDef {
  slug: TopicSlug;
  title: string;
  blurb: string;
  metrics: MetricKey[];
}

/** The 6-topic template every country follows, in display order. */
export const TOPICS: TopicDef[] = [
  { slug: 'work-life-balance', title: 'Work-life balance', blurb: 'Hours, weekends, leave and how people switch off', metrics: ['workHours', 'paidLeave'] },
  { slug: 'school-day', title: 'School day', blurb: 'Start times, uniforms, lunch and after-school life', metrics: ['schoolStartAge', 'schoolDayHours'] },
  { slug: 'weddings', title: 'Weddings', blurb: 'Rituals, guest lists, who pays and what people wear', metrics: ['weddingDays', 'weddingGuests'] },
  { slug: 'food', title: 'Food', blurb: 'Everyday meals, eating habits and one dish to try', metrics: ['dinnerTime'] },
  { slug: 'housing', title: 'Housing', blurb: 'How people live, rent or own, and who shares the home', metrics: ['householdSize', 'homeOwnership'] },
  { slug: 'transport', title: 'Transport', blurb: 'How people get to work and the systems that move them', metrics: ['commuteMinutes', 'publicTransportShare'] },
];

export const METRICS: Record<MetricKey, MetricDef> = {
  workHours: { key: 'workHours', label: 'Average working week', short: 'Work week', unit: 'hrs/week', topic: 'work-life-balance', plannedSource: 'ILO modelled estimates 2025' },
  paidLeave: { key: 'paidLeave', label: 'Minimum paid holidays a year', short: 'Paid holidays', unit: 'days/year', topic: 'work-life-balance', plannedSource: 'National labour law (statutory minimum)' },
  schoolStartAge: { key: 'schoolStartAge', label: 'School starting age', short: 'School starts at', unit: 'years old', topic: 'school-day', plannedSource: 'UNESCO UIS via World Bank API (live)' },
  schoolDayHours: { key: 'schoolDayHours', label: 'Typical school day', short: 'School day', unit: 'hours', topic: 'school-day', plannedSource: 'Editorial estimate' },
  weddingDays: { key: 'weddingDays', label: 'Typical wedding celebration', short: 'Wedding length', unit: 'days', topic: 'weddings', plannedSource: 'Editorial estimate' },
  weddingGuests: { key: 'weddingGuests', label: 'Typical wedding guest list', short: 'Wedding guests', unit: 'guests', topic: 'weddings', plannedSource: 'Editorial estimate' },
  dinnerTime: { key: 'dinnerTime', label: 'Typical dinner time', short: 'Dinner time', unit: '', topic: 'food', plannedSource: 'Editorial estimate' },
  householdSize: { key: 'householdSize', label: 'Average household size', short: 'Household size', unit: 'people', topic: 'housing', plannedSource: 'National censuses / UN DESA' },
  homeOwnership: { key: 'homeOwnership', label: 'Homes owned by the people living in them', short: 'Home ownership', unit: '%', topic: 'housing', plannedSource: 'Eurostat EU-SILC and national statistics' },
  commuteMinutes: { key: 'commuteMinutes', label: 'Typical one-way commute', short: 'Commute', unit: 'min', topic: 'transport', plannedSource: 'Editorial estimate' },
  publicTransportShare: { key: 'publicTransportShare', label: 'Commuters using public transport', short: 'Public transport', unit: '%', topic: 'transport', plannedSource: 'Editorial estimate' },
};

/** Metrics offered as colour layers on the Explore Map. */
export const LAYERS: MetricKey[] = [
  'workHours',
  'paidLeave',
  'schoolStartAge',
  'weddingGuests',
  'dinnerTime',
  'householdSize',
  'commuteMinutes',
];

export const getTopic = (slug: string) => TOPICS.find((t) => t.slug === slug);

/** Turns a metric value into display text, e.g. 20.5 -> "8:30 pm". */
export function formatMetric(key: MetricKey, value: number): string {
  if (key === 'dinnerTime') {
    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
  }
  // "1 day", not "1 days"
  const unit = value === 1 ? METRICS[key].unit.replace(/^(day|guest|hour)s/, '$1') : METRICS[key].unit;
  const n = Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toFixed(1);
  return unit === '%' ? `${n}%` : `${n} ${unit}`;
}

/** "Guess first" questions. The country with the higher number is the answer. */
export const QUESTIONS: Record<MetricKey, string> = {
  workHours: 'Who works the longer week?',
  paidLeave: 'Who gets more paid holidays?',
  schoolStartAge: 'Where do children start school later?',
  schoolDayHours: 'Who has the longer school day?',
  weddingDays: 'Whose weddings go on for longer?',
  weddingGuests: 'Who invites more wedding guests?',
  dinnerTime: 'Who sits down to dinner later?',
  householdSize: 'Whose homes are fuller?',
  homeOwnership: 'Where do more people own their home?',
  commuteMinutes: 'Who has the longer commute?',
  publicTransportShare: 'Where do more people take public transport?',
};

/** One accent colour per topic, used on country and compare pages. */
export const TOPIC_ACCENT: Record<TopicSlug, string> = {
  'work-life-balance': '#FFB72B',
  'school-day': '#8A5CF6',
  weddings: '#E84A7F',
  food: '#FF7A45',
  housing: '#FFB72B',
  transport: '#8A5CF6',
};
