import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const netherlands: Country = {
  slug: 'netherlands',
  name: 'Netherlands',
  isoNumeric: '528',
  flag: '🇳🇱',
  airport: 'AMS',
  region: 'Europe',
  tagline: 'More bicycles than people, and dinner at six sharp.',
  geo: { lat: 52.2, lng: 5.3 },
  quickFacts: { population: 'About 18 million', capital: 'Amsterdam', currency: 'Euro (€)', language: 'Dutch' },
  metrics: {
    workHours: s(31), paidLeave: s(20), schoolStartAge: s(5), schoolDayHours: s(6),
    weddingDays: s(1), weddingGuests: s(90), dinnerTime: s(18), householdSize: s(2.1),
    homeOwnership: s(70), commuteMinutes: s(30), publicTransportShare: s(12),
  },
  life: {
    currencyCode: 'EUR', currencySymbol: '€', perINR: s(0.0108), costIndex: s(290), rentShare: s(30),
    weekend: 'A bike ride along a canal, coffee and apple pie on a terrace, and friends over by appointment.',
  },
  topics: {
    'work-life-balance': topic(
      'The part-time capital of the world.',
      'The Netherlands has the shortest average working week in Europe, largely because part-time work is normal for both men and women. Many parents take a regular weekday off for childcare.',
      ['Employees receive a holiday allowance, paid out each May.', 'Meetings are direct and consensus matters.'],
      'Roughly sixteen fewer hours a week on average, the biggest gap on the site.',
    ),
    'school-day': topic(
      'Cycle to school, sprinkles for lunch.',
      'Most children start school at four and cycle there from a young age. Lunch is usually sandwiches from home, quite possibly topped with chocolate sprinkles.',
      ['Homework is light in primary school.', 'Wednesday afternoons are often free.'],
      'No uniform, little homework early on, and a bicycle instead of a school bus.',
    ),
    weddings: topic(
      'Day guests and evening guests.',
      'The legal wedding is a civil ceremony at the town hall. Couples typically invite a small group for the day and a wider circle for the evening party.',
      ['Costs are usually paid by the couple.', 'Friends often prepare a song or sketch.'],
      'A modest single-day event with under a hundred guests.',
    ),
    food: topic(
      'Bread twice a day, hot food once.',
      'Breakfast and lunch are typically bread with cheese or spreads, and the one hot meal is dinner, eaten around 6 pm. Fried snacks from a wall of coin-operated hatches are a national quirk.',
      ['Dropping in at dinner time without an invitation is unusual.', 'Coffee comes with exactly one biscuit, by tradition.'],
      'Dinner is three hours earlier, and a cold lunch is the norm rather than a cooked one.',
      'A warm stroopwafel from a market stall.',
    ),
    housing: topic(
      'Tall windows, steep stairs.',
      'The typical home is a terraced house with large front windows, often left uncurtained, and famously steep staircases. Young people usually move out at eighteen or so to study.',
      ['Social housing has long waiting lists in big cities.', 'Houseboats line the canals of Amsterdam.'],
      'Households are less than half the size, and leaving home at eighteen is expected.',
    ),
    transport: topic(
      'The bicycle has right of way.',
      'More than a quarter of all trips are made by bike, on a nationwide network of separated cycle paths. Trains link the cities, and many commuters cycle to the station.',
      ['There are more bicycles than residents.', 'Station bike garages hold thousands of bikes.'],
      'Two wheels rule here too, but they are pedal-powered and have their own roads.',
    ),
  },
  facts: [
    'The Netherlands has more bicycles than people.',
    'Chocolate sprinkles on buttered bread are a normal Dutch breakfast or lunch.',
  ],
  quizClues: [
    'Part-time work is so common that the average working week is the shortest in Europe.',
    'Chocolate sprinkles on bread count as lunch.',
    'There are more bicycles than people.',
  ],
  sources: COUNTRY_SOURCES,
};

export default netherlands;
