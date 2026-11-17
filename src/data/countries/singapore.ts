import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const singapore: Country = {
  slug: 'singapore',
  name: 'Singapore',
  isoNumeric: '702',
  flag: '🇸🇬',
  airport: 'SIN',
  region: 'Asia',
  tagline: 'A whole country you can cross by train before lunch.',
  geo: { lat: 1.35, lng: 103.8 },
  quickFacts: { population: 'About 6 million', capital: 'Singapore', currency: 'Singapore dollar (S$)', language: 'English, Mandarin, Malay and Tamil' },
  metrics: {
    workHours: s(43), paidLeave: s(7), schoolStartAge: s(7), schoolDayHours: s(6.5),
    weddingDays: s(1), weddingGuests: s(300), dinnerTime: s(19.5), householdSize: s(3.1),
    homeOwnership: s(89), commuteMinutes: s(42), publicTransportShare: s(60),
  },
  life: {
    currencyCode: 'SGD', currencySymbol: 'S$', perINR: s(0.016), costIndex: s(330), rentShare: s(30),
    weekend: 'Kaya toast and kopi at a hawker centre, a walk through a park connector, and a late supper because it is still 28 degrees.',
  },
  topics: {
    'work-life-balance': topic(
      'Efficient, ambitious, and air-conditioned.',
      'Working hours are on the long side and the pace is quick. Statutory leave starts low and grows with years of service, though many employers offer more.',
      ['Public holidays reflect four cultures: Chinese New Year, Hari Raya, Deepavali and Christmas.', 'Flexible work requests now follow a formal national guideline.'],
      'Hours are a little shorter than in India, and Deepavali is a public holiday here too.',
    ),
    'school-day': topic(
      'Two languages from day one.',
      'Children start primary school in the year they turn seven and study in English plus a "mother tongue" such as Mandarin, Malay or Tamil. Co-curricular activities are part of the timetable.',
      ['Uniforms are standard.', 'A national exam at the end of primary school guides the next stage.'],
      'Uniforms and exam focus are familiar. Tamil is one of the official school languages.',
    ),
    weddings: topic(
      'A banquet, a void deck, or both.',
      'Wedding styles follow the community: Chinese hotel banquets, Malay celebrations often held in the open ground floor of housing blocks, and Indian temple ceremonies. Guests commonly give cash in a red or green packet.',
      ['Chinese couples often serve tea to elders before the banquet.', 'Guest lists of several hundred are common.'],
      'Large guest lists and cash gifts are shared. Indian-Singaporean weddings would look very familiar.',
    ),
    food: topic(
      'Dinner is downstairs, at the hawker centre.',
      'Open-air hawker centres sell cooked food from dozens of stalls at low prices, and many people eat out daily. Hawker culture is recognised by UNESCO.',
      ['A packet of tissues on a table means the seat is taken.', 'Chinese, Malay and Indian dishes share the same food court.'],
      'Eating out is far more routine than in India, where home cooking leads. Roti prata is a close cousin of the paratha.',
      'Hainanese chicken rice from a hawker stall.',
    ),
    housing: topic(
      'Public housing that most people own.',
      'About four in five residents live in flats built by the Housing and Development Board, and most own them on long leases. Young couples typically apply for a new flat and wait for it to be built.',
      ['Blocks are planned with shops, schools and food centres nearby.', 'Many adults live with parents until they marry.'],
      'Living with parents until marriage is common in both. Here, the government is the main home builder.',
    ),
    transport: topic(
      'Trains for everyone, cars for a price.',
      'The MRT rail network and buses carry most commuters. Owning a car requires bidding for a ten-year permit that can cost more than the car itself.',
      ['Eating and drinking on trains is prohibited.', 'Covered walkways link stations to housing blocks.'],
      'Public transport share is roughly double India\'s, and commuting by two-wheeler is rare.',
    ),
  },
  facts: [
    'In Singapore, the permit to own a car can cost more than the car.',
    'Leaving a packet of tissues on a hawker table is an accepted way to reserve it.',
  ],
  quizClues: [
    'You must bid for a ten-year permit before you can own a car.',
    'A packet of tissues on a food-court table means the seat is taken.',
    'Most people live in public housing flats, and most own them.',
  ],
  sources: COUNTRY_SOURCES,
};

export default singapore;
