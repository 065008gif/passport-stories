import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const china: Country = {
  slug: 'china',
  name: 'China',
  isoNumeric: '156',
  flag: '🇨🇳',
  airport: 'PEK',
  region: 'Asia',
  tagline: 'A phone, a QR code and a high-speed train to almost anywhere.',
  geo: { lat: 35, lng: 103 },
  quickFacts: { population: 'About 1.4 billion', capital: 'Beijing', currency: 'Renminbi yuan (¥)', language: 'Mandarin Chinese' },
  metrics: {
    workHours: s(46), paidLeave: s(5), schoolStartAge: s(6), schoolDayHours: s(8),
    weddingDays: s(1), weddingGuests: s(250), dinnerTime: s(18.5), householdSize: s(2.6),
    homeOwnership: s(90), commuteMinutes: s(40), publicTransportShare: s(35),
  },
  life: {
    currencyCode: 'CNY', currencySymbol: '¥', perINR: s(0.085), costIndex: s(150), rentShare: s(30),
    weekend: 'Morning tea and dumplings with the family, an afternoon in a park full of dancers and card players, hotpot at night.',
  },
  topics: {
    'work-life-balance': topic(
      'Long weeks, a lunchtime nap, and two giant holidays.',
      'Working hours are long, and some tech firms became known for a "996" schedule of 9 am to 9 pm, six days a week. A midday rest is common, and the whole country travels during Spring Festival and National Day.',
      ['A short nap after lunch is normal in many offices.', 'Weekend days are sometimes swapped to create longer public holidays.'],
      'Long hours are familiar. Personal annual leave is shorter, with rest concentrated in shared national holidays, much like the festival calendar in India.',
    ),
    'school-day': topic(
      'Morning exercises and one exam above all.',
      'School days are long and structured, with group exercises and a midday break. The gaokao university entrance exam shapes the final years of school for millions.',
      ['Eye exercises set to music are part of the school routine.', 'Many students board at school in the senior years.'],
      'The gaokao is comparable in weight to JEE or NEET, but nearly every student sits the same exam.',
    ),
    weddings: topic(
      'Red for luck, tea for the elders.',
      'Weddings centre on a banquet, with red as the colour of good fortune. Many couples serve tea to their parents in a short ceremony, and guests give money in red envelopes.',
      ['The groom\'s party often plays door games to "win" entry to the bride\'s home.', 'Banquets run to many courses, each with a lucky meaning.'],
      'Red, family elders and cash gifts are shared ground. The celebration is usually a single day.',
    ),
    food: topic(
      'Everything is shared, and the water is hot.',
      'Dishes go in the middle of a round table and everyone helps themselves, with rice or noodles alongside. Cuisine varies hugely by region, and hot water or tea is the default drink.',
      ['Breakfast is often bought on the street: buns, crepes, soy milk.', 'Dinner is eaten early, commonly around 6 to 7 pm.'],
      'Sharing from common dishes is the same. Dinner happens two or more hours earlier.',
      'Xiaolongbao, soup-filled dumplings, eaten carefully.',
    ),
    housing: topic(
      'Own the flat, and grandparents share the childcare.',
      'Home ownership is very high, and most city families live in apartment towers. Grandparents frequently help raise grandchildren, sometimes living in the same home.',
      ['Owning a home is often expected before marriage.', 'Residential compounds have their own gates, gardens and shops.'],
      'High ownership and grandparents at home are both familiar. Households are smaller.',
    ),
    transport: topic(
      'The world\'s largest high-speed rail network.',
      'Cities run on metros, buses, electric scooters and shared bicycles, all paid for by phone. Between cities, high-speed trains link most major centres.',
      ['Mobile payment by QR code is near universal.', 'E-bikes fill dedicated lanes in most cities.'],
      'QR payments feel like UPI. Metro coverage and intercity rail speeds are on a different scale.',
    ),
  },
  facts: [
    'China has the largest high-speed rail network in the world.',
    'Many Chinese schools play music for daily eye exercises.',
  ],
  quizClues: [
    'Students do eye exercises to music as part of the school day.',
    'Wedding guests give money in red envelopes.',
    'It has the largest high-speed rail network on the planet.',
  ],
  sources: COUNTRY_SOURCES,
};

export default china;
