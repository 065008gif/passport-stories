import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const uae: Country = {
  slug: 'uae',
  name: 'UAE',
  isoNumeric: '784',
  flag: '🇦🇪',
  airport: 'DXB',
  region: 'Asia',
  tagline: 'Two hundred nationalities, one very cold shopping mall.',
  geo: { lat: 24, lng: 54 },
  quickFacts: { population: 'About 10 million', capital: 'Abu Dhabi', currency: 'UAE dirham (AED)', language: 'Arabic, with English widely used' },
  metrics: {
    workHours: s(44), paidLeave: s(30), schoolStartAge: s(6), schoolDayHours: s(6.5),
    weddingDays: s(2), weddingGuests: s(400), dinnerTime: s(21), householdSize: s(4.2),
    homeOwnership: s(28), commuteMinutes: s(35), publicTransportShare: s(12),
  },
  life: {
    currencyCode: 'AED', currencySymbol: 'AED ', perINR: s(0.043), costIndex: s(240), rentShare: s(33),
    weekend: 'Friday brunch that lasts all afternoon, a beach at sunset, and karak chai from a car window at midnight.',
  },
  topics: {
    'work-life-balance': topic(
      'A Monday-to-Friday week, with a short Friday.',
      'In 2022 the UAE moved its official weekend to Saturday and Sunday, with a half day on Friday for prayers in the public sector. Working hours are shortened during Ramadan.',
      ['Most of the workforce is from abroad.', 'Life shifts to the evening in the hot months.'],
      'Many Indians already know this working life first-hand: Indians are the largest expatriate community.',
    ),
    'school-day': topic(
      'Pick a curriculum: British, American, Indian or IB.',
      'Private schools follow many national curricula, including CBSE, so classmates can come from dozens of countries. School starts early to beat the heat.',
      ['Arabic is taught in all schools.', 'School buses are a major part of the morning traffic.'],
      'A student can study the same CBSE syllabus here as in Delhi, in a far more international classroom.',
    ),
    weddings: topic(
      'Two celebrations, one for each side.',
      'Traditional Emirati weddings are large and often held as separate gatherings for men and women. Expat weddings follow the customs of the couple\'s home country.',
      ['Henna night for the bride comes before the wedding.', 'Hospitality on a grand scale is a point of pride.'],
      'Henna, big guest lists and multi-day festivities are all shared ground.',
    ),
    food: topic(
      'Every cuisine on one street.',
      'Emirati dishes such as machboos, spiced rice with meat or fish, sit alongside Lebanese, Indian, Pakistani and Filipino food. Late dinners are normal, and karak chai is a daily habit.',
      ['Dates and Arabic coffee are offered to welcome guests.', 'During Ramadan, the evening iftar meal is a social event.'],
      'Dinner time matches India, and karak chai is a direct descendant of masala chai.',
      'Shawarma from a neighbourhood cafeteria, with garlic sauce.',
    ),
    housing: topic(
      'Most residents rent, a year at a time.',
      'Expatriates, the large majority of residents, mostly rent apartments or villas, with rent often paid in a few post-dated cheques. Emirati families tend to live in larger family homes.',
      ['Apartment towers commonly include a pool and gym.', 'Shared accommodation is common among workers.'],
      'Ownership is far lower than in India because most residents are on work visas.',
    ),
    transport: topic(
      'A driving country with a driverless metro.',
      'Most people get around by car on wide highways. Dubai\'s metro is fully automated, with a Gold Class cabin and a cabin reserved for women and children.',
      ['Taxis are plentiful and metered.', 'Road tolls are charged automatically by a windscreen tag.'],
      'Two-wheelers are rare and public transport use is lower. Reserved women\'s cabins exist in both.',
    ),
  },
  facts: [
    'Dubai\'s metro trains have no drivers.',
    'The UAE changed its official weekend to Saturday and Sunday in 2022.',
  ],
  quizClues: [
    'It changed its official weekend to Saturday and Sunday in 2022.',
    'Its biggest city has a driverless metro with a Gold Class cabin.',
    'The large majority of its residents are from other countries.',
  ],
  sources: COUNTRY_SOURCES,
};

export default uae;
