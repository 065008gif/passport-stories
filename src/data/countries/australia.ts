import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const australia: Country = {
  slug: 'australia',
  name: 'Australia',
  isoNumeric: '036',
  flag: '🇦🇺',
  airport: 'SYD',
  region: 'Oceania',
  tagline: 'No hat, no play. Flat white, no worries.',
  geo: { lat: -25, lng: 134 },
  quickFacts: { population: 'About 27 million', capital: 'Canberra', currency: 'Australian dollar (A$)', language: 'English' },
  metrics: {
    workHours: s(36), paidLeave: s(20), schoolStartAge: s(6), schoolDayHours: s(6.5),
    weddingDays: s(1), weddingGuests: s(100), dinnerTime: s(18.5), householdSize: s(2.5),
    homeOwnership: s(66), commuteMinutes: s(30), publicTransportShare: s(12),
  },
  life: {
    currencyCode: 'AUD', currencySymbol: 'A$', perINR: s(0.018), costIndex: s(300), rentShare: s(30),
    weekend: 'An early swim, brunch with a flat white, and a barbecue in a public park where the grill is free.',
  },
  topics: {
    'work-life-balance': topic(
      'Four weeks off and a legal right to switch off.',
      'Full-time employees get four weeks of annual leave, plus extra "long service leave" after many years with one employer. Since 2024, workers have a legal right to ignore unreasonable out-of-hours contact.',
      ['The standard full-time week is 38 hours.', 'Early starts and early finishes are common.'],
      'About ten fewer hours a week and a law that protects your evening.',
    ),
    'school-day': topic(
      'No hat, no play.',
      'Uniforms usually include a wide-brimmed hat, and children without one must stay in the shade at break time. The school year runs from late January to December.',
      ['School typically finishes around 3 pm.', 'Children in remote areas can study by radio and internet through "School of the Air".'],
      'Uniforms are shared, but the school year follows the calendar year and the hat is compulsory.',
    ),
    weddings: topic(
      'Outdoors, relaxed, and often at a winery.',
      'Many couples marry outdoors, at a beach, garden or vineyard, with a civil celebrant rather than in a place of worship. The mood is informal and the guest list around a hundred.',
      ['Couples usually pay for their own wedding.', 'Speeches are expected to be funny.'],
      'A single relaxed day with a quarter of the guests.',
    ),
    food: topic(
      'Brunch is a serious business.',
      'Cafe culture is strong, with excellent coffee and long weekend brunches. The backyard or beachside barbecue is the classic way to host friends.',
      ['Public parks have free electric barbecues.', 'Vegemite on toast divides visitors.'],
      'Dinner is two to three hours earlier. Indian food is widely available in the big cities.',
      'A meat pie with tomato sauce, or avocado on toast with a flat white.',
    ),
    housing: topic(
      'The backyard dream.',
      'The traditional goal is a detached house with a garden, though apartments are growing in the big cities. Young adults often live in "share houses" with friends.',
      ['Rental homes are inspected regularly by agents.', 'Outdoor living space matters as much as indoor.'],
      'More space, smaller households, and friends rather than relatives as housemates.',
    ),
    transport: topic(
      'Drive most days, ferry on the good ones.',
      'Australian cities are spread out and most people drive to work. Sydney commuters can also travel by ferry across the harbour, and Melbourne has the world\'s largest tram network.',
      ['Distances between cities are vast; flying is routine.', 'Trams in central Melbourne are free.'],
      'Shorter commutes, mostly by car, and hardly any two-wheelers.',
    ),
  },
  facts: [
    'Australian schoolchildren without a hat have to play in the shade.',
    'Melbourne has the largest tram network in the world.',
  ],
  quizClues: [
    'Schoolchildren who forget their hat must stay in the shade at break.',
    'Some children in remote areas attend "School of the Air".',
    'The school year starts in late January, in the middle of summer.',
  ],
  sources: COUNTRY_SOURCES,
};

export default australia;
