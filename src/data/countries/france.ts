import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const france: Country = {
  slug: 'france',
  name: 'France',
  isoNumeric: '250',
  flag: '🇫🇷',
  airport: 'CDG',
  region: 'Europe',
  tagline: 'Lunch is not a break. Lunch is the point.',
  geo: { lat: 46.5, lng: 2.5 },
  quickFacts: { population: 'About 68 million', capital: 'Paris', currency: 'Euro (€)', language: 'French' },
  metrics: {
    workHours: s(36), paidLeave: s(25), schoolStartAge: s(3), schoolDayHours: s(8),
    weddingDays: s(1), weddingGuests: s(120), dinnerTime: s(20), householdSize: s(2.2),
    homeOwnership: s(63), commuteMinutes: s(32), publicTransportShare: s(18),
  },
  life: {
    currencyCode: 'EUR', currencySymbol: '€', perINR: s(0.0108), costIndex: s(275), rentShare: s(27),
    weekend: 'The Sunday market for cheese and a roast chicken, a three-hour family lunch, and a walk to recover.',
  },
  topics: {
    'work-life-balance': topic(
      'A 35-hour week and the right to disconnect.',
      'The legal working week is 35 hours and employees get five weeks of paid leave. A national law gives workers the right not to answer work emails outside office hours.',
      ['Much of the country goes on holiday in August.', 'A proper sit-down lunch is the norm.'],
      'About ten fewer hours a week, and nearly twice the paid leave.',
    ),
    'school-day': topic(
      'A long day with a four-course canteen lunch.',
      'School is compulsory from age three and days are long, often 8:30 to 4:30. The canteen serves a starter, main, cheese or dairy and dessert, and Wednesday afternoons are often free in primary school.',
      ['No uniforms in most state schools.', 'Students end school with the baccalauréat exam.'],
      'Children start three years earlier, and the school lunch is a served meal rather than a tiffin.',
    ),
    weddings: topic(
      'Town hall first, then dinner until dawn.',
      'Only the civil ceremony at the town hall is legally binding, so every couple begins there. A reception drink for many guests is followed by a long seated dinner and dancing into the early hours.',
      ['The classic wedding cake is a tower of cream puffs, the croquembouche.', 'Onion soup is sometimes served to the last guests standing.'],
      'One long day and night instead of several, with around a quarter of the guests.',
    ),
    food: topic(
      'Three courses, even on a Tuesday.',
      'Meals are eaten at set times and at a table, and a daily baguette from the bakery is routine. Dinner is around 8 pm and often includes a cheese course.',
      ['Snacking between meals is uncommon for adults.', 'Lunch breaks of an hour or more are typical.'],
      'Dinner is only about an hour earlier than in India, one of the closest matches in Europe.',
      'A fresh croissant from a neighbourhood bakery, eaten the same morning.',
    ),
    housing: topic(
      'City flats and a notebook of paperwork.',
      'In cities most people live in apartments, many in older stone buildings, and renting requires a thick file of documents. Young people usually leave home in their early twenties.',
      ['Rental flats are often let unfurnished.', 'The building caretaker, the gardien, is a classic Parisian figure.'],
      'Households are half the size, and moving out before marriage is standard.',
    ),
    transport: topic(
      'Métro in town, TGV between towns.',
      'Paris runs on its dense métro, while high-speed TGV trains link major cities in a few hours. Employers reimburse half the cost of a public transport pass.',
      ['Many cities have added tram lines and bike lanes.', 'Outside big cities, most people drive.'],
      'Commutes are shorter, and intercity rail is much faster.',
    ),
  },
  facts: [
    'French law gives employees the right to ignore work emails after hours.',
    'French school canteens typically serve a multi-course lunch.',
  ],
  quizClues: [
    'School is compulsory from the age of three.',
    'Workers have a legal right to disconnect from work emails after hours.',
    'The traditional wedding cake is a tower of cream puffs.',
  ],
  sources: COUNTRY_SOURCES,
};

export default france;
