import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const finland: Country = {
  slug: 'finland',
  name: 'Finland',
  isoNumeric: '246',
  flag: '🇫🇮',
  airport: 'HEL',
  region: 'Europe',
  tagline: 'Short school days, long summer nights, a sauna in the building.',
  geo: { lat: 64, lng: 26 },
  quickFacts: { population: 'About 5.6 million', capital: 'Helsinki', currency: 'Euro (€)', language: 'Finnish and Swedish' },
  metrics: {
    workHours: s(36), paidLeave: s(25), schoolStartAge: s(7), schoolDayHours: s(5),
    weddingDays: s(1), weddingGuests: s(80), dinnerTime: s(17.5), householdSize: s(2),
    homeOwnership: s(70), commuteMinutes: s(26), publicTransportShare: s(18),
  },
  life: {
    currencyCode: 'EUR', currencySymbol: '€', perINR: s(0.0108), costIndex: s(265), rentShare: s(25),
    weekend: 'A lakeside cottage, a wood-fired sauna, a jump into cold water, and a comfortable amount of silence.',
  },
  topics: {
    'work-life-balance': topic(
      'Flexible hours by law, July by the lake.',
      'Finnish law gives most full-time employees a say over when and where they work part of their hours. Long summer holidays are usually spent at a cottage, and many workplaces go quiet in July.',
      ['Leaving on time is expected.', 'Workplace saunas are not unusual.'],
      'About ten fewer hours a week, and a summer holiday measured in weeks, not days.',
    ),
    'school-day': topic(
      'Start at seven, play every hour.',
      'Formal school begins at age seven, days are short, and each lesson is followed by a 15-minute outdoor break. Lunch is free and homework is light.',
      ['Teachers hold master\'s degrees and are highly trusted.', 'There are few standardised tests before the end of school.'],
      'A later start, a shorter day and far fewer exams, with results that rank well internationally.',
    ),
    weddings: topic(
      'A summer Saturday, kept simple.',
      'Weddings are typically small and held in summer, when the light lasts late into the night. The celebration is relaxed, with speeches, a waltz and sometimes a sauna the day before.',
      ['Couples usually pay for the wedding themselves.', 'Living together before marriage is the norm.'],
      'A single day with a guest list about a fifth the size.',
    ),
    food: topic(
      'Rye bread, berries and a lot of coffee.',
      'Lunch is the main hot meal and is eaten early, often by 11:30. Finns are among the world\'s heaviest coffee drinkers, and picking wild berries and mushrooms is a common pastime.',
      ['Dinner is eaten around 5 to 6 pm.', 'Dark rye bread is on nearly every table.'],
      'Dinner here is over before most Indian households have started cooking.',
      'Karelian pasty with egg butter, or a slice of fresh rye bread.',
    ),
    housing: topic(
      'A sauna for every two people.',
      'Finland has roughly three million saunas for a population of under six million; most homes or apartment buildings have one. Households are small and many families keep a summer cottage.',
      ['Shoes come off at the door.', 'Triple-glazed windows keep winter out.'],
      'Households are less than half the size, and the family heirloom is a sauna stove.',
    ),
    transport: topic(
      'Trams in Helsinki, skis in the north.',
      'Helsinki relies on trams, metro and buses, while the rest of this large, sparsely populated country mostly drives. Roads and cycle paths are kept open through deep winter.',
      ['Children commonly travel to school on their own.', 'Winter tyres are mandatory.'],
      'The shortest commute on the site, and the coldest.',
    ),
  },
  facts: [
    'Finland has about three million saunas for under six million people.',
    'Finnish children do not start formal school until they are seven.',
  ],
  quizClues: [
    'School lessons are followed by a 15-minute outdoor break, every time.',
    'Children start formal school at seven.',
    'There is roughly one sauna for every two people.',
  ],
  sources: COUNTRY_SOURCES,
};

export default finland;
