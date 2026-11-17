import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const egypt: Country = {
  slug: 'egypt',
  name: 'Egypt',
  isoNumeric: '818',
  flag: '🇪🇬',
  airport: 'CAI',
  region: 'Africa',
  tagline: 'A city that wakes up properly after sunset.',
  geo: { lat: 26.5, lng: 30 },
  quickFacts: { population: 'About 112 million', capital: 'Cairo', currency: 'Egyptian pound (E£)', language: 'Arabic' },
  metrics: {
    workHours: s(44), paidLeave: s(21), schoolStartAge: s(6), schoolDayHours: s(6),
    weddingDays: s(2), weddingGuests: s(300), dinnerTime: s(21), householdSize: s(4),
    homeOwnership: s(76), commuteMinutes: s(40), publicTransportShare: s(35),
  },
  life: {
    currencyCode: 'EGP', currencySymbol: 'E£', perINR: s(0.57), costIndex: s(95), rentShare: s(30),
    weekend: 'Friday lunch with the whole family, tea and backgammon at a street cafe, and a walk by the Nile at midnight.',
  },
  topics: {
    'work-life-balance': topic(
      'Sunday to Thursday.',
      'The working week runs from Sunday to Thursday, with Friday as the main day of rest. During Ramadan, working hours shorten and social life moves to the night.',
      ['Evenings out start late and run later.', 'Tea is offered in almost every meeting.'],
      'Similar hours, a different weekend, and the same habit of doing business over tea.',
    ),
    'school-day': topic(
      'School in the morning, lessons at night.',
      'Students wear uniforms and start early. Private tutoring after school is widespread, especially before the final secondary exam that decides university places.',
      ['Classes in state schools can be large.', 'The final exam results are national news.'],
      'Uniforms, tuition and one decisive exam: one of the closest matches to the Indian school experience.',
    ),
    weddings: topic(
      'Drums and horns announce the couple.',
      'The celebration opens with the zaffa, a procession of drummers, horns and dancers leading the couple in. Weddings are large and late, and families share the cost of setting up the new home.',
      ['The groom traditionally gives the bride a gift of gold.', 'Car convoys honk their way through the streets.'],
      'A noisy procession, gold, hundreds of guests and two families deeply involved: very familiar ground.',
    ),
    food: topic(
      'Beans for breakfast, koshari for lunch.',
      'Breakfast is often ful, slow-cooked fava beans, with falafel made from the same bean. Koshari, a mix of rice, lentils, pasta and spicy tomato sauce, is the national street dish.',
      ['Flatbread comes with everything.', 'Dinner is late, often after 9 pm.'],
      'Dinner time matches India exactly, and koshari is a cousin of khichdi.',
      'Koshari from a busy street shop, with extra crispy onions.',
    ),
    housing: topic(
      'A flat before the wedding.',
      'Most city families live in apartments, and young people typically live with their parents until they marry. Securing a flat is traditionally part of preparing for marriage.',
      ['Extended families often live in the same building.', 'Rooftops are used as extra living space.'],
      'Household size and living with parents until marriage are almost identical.',
    ),
    transport: topic(
      'Africa\'s first metro, and a microbus for everything else.',
      'Cairo\'s metro, opened in 1987, was the first in Africa and carries millions daily. Shared microbuses cover the rest of the city, with routes called out by the driver.',
      ['Metro trains include women-only carriages.', 'Traffic never fully stops.'],
      'Crowded metros, women\'s carriages and creative shared transport will all feel like home.',
    ),
  },
  facts: [
    'Cairo\'s metro was the first in Africa.',
    'Egypt\'s national dish, koshari, mixes rice, lentils and pasta in one bowl.',
  ],
  quizClues: [
    'The working week runs from Sunday to Thursday.',
    'The wedding begins with a zaffa, a procession of drums and horns.',
    'Its capital opened the first metro in Africa, not far from the pyramids.',
  ],
  sources: COUNTRY_SOURCES,
};

export default egypt;
