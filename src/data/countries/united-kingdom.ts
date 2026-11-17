import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const unitedKingdom: Country = {
  slug: 'united-kingdom',
  name: 'United Kingdom',
  isoNumeric: '826',
  flag: '🇬🇧',
  airport: 'LHR',
  region: 'Europe',
  tagline: 'Queue politely, talk about the weather, put the kettle on.',
  geo: { lat: 54, lng: -2 },
  quickFacts: { population: 'About 68 million', capital: 'London', currency: 'Pound sterling (£)', language: 'English' },
  metrics: {
    workHours: s(36), paidLeave: s(28), schoolStartAge: s(5), schoolDayHours: s(6.5),
    weddingDays: s(1), weddingGuests: s(80), dinnerTime: s(18.5), householdSize: s(2.4),
    homeOwnership: s(65), commuteMinutes: s(30), publicTransportShare: s(16),
  },
  life: {
    currencyCode: 'GBP', currencySymbol: '£', perINR: s(0.0092), costIndex: s(280), rentShare: s(32),
    weekend: 'A lie-in, a Sunday roast at the pub with friends, and a walk across a muddy field that everyone insists is lovely.',
  },
  topics: {
    'work-life-balance': topic(
      'Twenty-eight days off and a pint on Friday.',
      'Full-time workers are entitled to 28 days of paid leave a year, which can include public "bank holidays". A drink with colleagues after work on Thursday or Friday is a long-running custom.',
      ['Lunch is often a sandwich at the desk.', 'Hybrid working is now common in office jobs.'],
      'About ten fewer hours a week and nearly double the leave.',
    ),
    'school-day': topic(
      'Blazers, ties and school dinners.',
      'Children start school at four or five, and uniforms, often with a blazer and tie, are near universal. Most schools run from about 9 am to 3:30 pm.',
      ['Cooked "school dinners" are served at lunchtime.', 'Exams called GCSEs at 16 and A-levels at 18 mark the later years.'],
      'Uniforms and big exams at 16 and 18 mirror the Indian pattern closely. School starts at a younger age.',
    ),
    weddings: topic(
      'Speeches, hats and a separate evening guest list.',
      'A typical wedding is one day: ceremony, meal with speeches, then a party. It is common to invite extra guests just for the evening.',
      ['The best man\'s speech is expected to tease the groom.', 'Many women wear hats or fascinators.'],
      'A much smaller guest list and a single day. British Asian weddings often blend both styles.',
    ),
    food: topic(
      'Tea solves most things.',
      'Tea with milk punctuates the day, a supermarket "meal deal" is a standard lunch, and the Sunday roast is the week\'s big meal. Curry is one of the nation\'s favourite foods.',
      ['The evening meal is called "tea" in parts of the country.', 'Dinner is commonly eaten around 6 to 7 pm.'],
      'A shared devotion to tea. Dinner is about two and a half hours earlier.',
      'A Sunday roast with Yorkshire pudding and gravy.',
    ),
    housing: topic(
      'Rows of terraced houses and the property ladder.',
      'Much of the housing is terraced or semi-detached with a small garden. Young adults often rent rooms in shared houses, and buying a first home is a major life goal.',
      ['Carpeted floors are common.', 'Separate hot and cold taps survive in older homes.'],
      'Smaller households, and sharing a house with friends rather than family in your twenties.',
    ),
    transport: topic(
      'The oldest underground railway in the world.',
      'London\'s Underground opened in 1863 and still carries millions daily, paid for with a tap of a bank card. Outside London, most people drive, on the left.',
      ['People queue in order for the bus.', 'Standing on the right of escalators is an unwritten law.'],
      'Driving on the left is shared. Commutes are shorter and far more orderly.',
    ),
  },
  facts: [
    'The London Underground opened in 1863, making it the world\'s oldest metro.',
    'At many British weddings, some guests are invited only to the evening party.',
  ],
  quizClues: [
    'Some wedding guests are invited only for the evening party.',
    'The main evening meal is called "tea" in parts of the country.',
    'Its capital has the world\'s oldest underground railway.',
  ],
  sources: COUNTRY_SOURCES,
};

export default unitedKingdom;
