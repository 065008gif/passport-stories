import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const mexico: Country = {
  slug: 'mexico',
  name: 'Mexico',
  isoNumeric: '484',
  flag: '🇲🇽',
  airport: 'MEX',
  region: 'Americas',
  tagline: 'The main meal is at three, and the tortillas are still warm.',
  geo: { lat: 23, lng: -102 },
  quickFacts: { population: 'About 130 million', capital: 'Mexico City', currency: 'Mexican peso ($)', language: 'Spanish' },
  metrics: {
    workHours: s(43), paidLeave: s(12), schoolStartAge: s(3), schoolDayHours: s(5),
    weddingDays: s(1), weddingGuests: s(200), dinnerTime: s(20.5), householdSize: s(3.6),
    homeOwnership: s(68), commuteMinutes: s(45), publicTransportShare: s(35),
  },
  life: {
    currencyCode: 'MXN', currencySymbol: 'MX$', perINR: s(0.21), costIndex: s(150), rentShare: s(28),
    weekend: 'Tacos from the market stall, a family lunch that fills the whole afternoon, and music in the plaza after dark.',
  },
  topics: {
    'work-life-balance': topic(
      'Long hours and a Christmas bonus by law.',
      'Mexicans work some of the longest hours among developed economies. Minimum paid leave was doubled to twelve days in 2023, and employers must pay a year-end bonus called the aguinaldo.',
      ['The long midday meal shapes the working day.', 'Family events take priority.'],
      'Long hours and modest leave are very similar. The legally required year-end bonus resembles a Diwali bonus.',
    ),
    'school-day': topic(
      'Flag ceremony on Monday.',
      'Preschool is compulsory from age three. Many schools run morning and afternoon shifts, uniforms are standard, and Mondays begin with a ceremony honouring the flag.',
      ['A mid-morning snack break is the main meal at school.', 'Schools close for the Day of the Dead.'],
      'Uniforms and a morning assembly make this one of the most familiar school days on the site.',
    ),
    weddings: topic(
      'Sponsors, a lasso and mariachi.',
      'Padrinos, chosen sponsors, help pay for and bless parts of the wedding. During the ceremony a decorated cord, the lazo, is draped around the couple in a figure of eight.',
      ['Receptions are large and run late, with a second round of food after midnight.', 'A mariachi band often plays.'],
      'Large guest lists, shared costs across the extended family and all-night music: very close in spirit.',
    ),
    food: topic(
      'Lunch at three, tacos at midnight.',
      'The main meal, la comida, is eaten between 2 and 4 pm, with a lighter supper late in the evening. Corn tortillas appear at nearly every meal and street food is a daily pleasure.',
      ['Chilli, lime and salt go on almost everything, including fruit.', 'Traditional Mexican cuisine is recognised by UNESCO.'],
      'Flatbread with every meal, plenty of chilli, and street food culture: a strong match.',
      'Tacos al pastor, sliced from a vertical spit with pineapple.',
    ),
    housing: topic(
      'Family close by, often under one roof.',
      'Multigenerational homes are common, and adult children frequently live with their parents until they marry. Families often add rooms or floors to a house over time.',
      ['Homes are commonly built around a shared patio.', 'Neighbourhood life happens on the street.'],
      'Household size and the habit of living with parents are close to India\'s.',
    ),
    transport: topic(
      'A metro where every station has a picture.',
      'Mexico City\'s metro is one of the cheapest in the world, and each station has its own icon so it can be recognised without reading. Minibuses fill the gaps, and cable cars now serve hillside neighbourhoods.',
      ['Some carriages are reserved for women and children.', 'Commutes across the capital are long.'],
      'Commute times match India\'s, and women-only carriages are used in both.',
    ),
  },
  facts: [
    'Every station on the Mexico City metro has its own picture icon.',
    'Mexico doubled its minimum paid holiday allowance in 2023.',
  ],
  quizClues: [
    'Every metro station in the capital has its own picture symbol.',
    'A decorated cord is looped around the couple during the wedding.',
    'The main meal of the day is eaten around three in the afternoon, with tortillas.',
  ],
  sources: COUNTRY_SOURCES,
};

export default mexico;
