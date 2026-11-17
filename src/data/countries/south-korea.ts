import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const southKorea: Country = {
  slug: 'south-korea',
  name: 'South Korea',
  isoNumeric: '410',
  flag: '🇰🇷',
  airport: 'ICN',
  region: 'Asia',
  tagline: 'Fast internet, faster deliveries, and study cafes open past midnight.',
  geo: { lat: 36.5, lng: 127.8 },
  quickFacts: { population: 'About 52 million', capital: 'Seoul', currency: 'South Korean won (₩)', language: 'Korean' },
  metrics: {
    workHours: s(38), paidLeave: s(15), schoolStartAge: s(6), schoolDayHours: s(7),
    weddingDays: s(1), weddingGuests: s(250), dinnerTime: s(19), householdSize: s(2.3),
    homeOwnership: s(57), commuteMinutes: s(45), publicTransportShare: s(40),
  },
  life: {
    currencyCode: 'KRW', currencySymbol: '₩', perINR: s(16), costIndex: s(260), rentShare: s(27),
    weekend: 'A hike up a city mountain with half of Seoul, then fried chicken and a river picnic delivered to your mat.',
  },
  topics: {
    'work-life-balance': topic(
      'A 52-hour cap, and dinner with the team.',
      'Hours have come down from famously long levels and the legal working week is capped at 52 hours including overtime. Team dinners, called hoesik, are still part of office life.',
      ['Seniority shapes who speaks, pours and leaves first.', 'Younger workers increasingly protect their evenings.'],
      'Office hierarchy will feel familiar. Recorded hours are now shorter than in India, though the pressure to stay is similar.',
    ),
    'school-day': topic(
      'School, then the second school.',
      'After a full school day many students go on to hagwons, private academies that run late into the evening. The national university entrance exam is so important that flights are paused during the listening test.',
      ['Students clean their own classrooms.', 'Hagwons in Seoul have a 10 pm curfew.'],
      'Think coaching classes, but for almost everyone. The single high-stakes exam resembles the pressure of boards and entrance tests combined.',
    ),
    weddings: topic(
      'Thirty minutes, hundreds of guests.',
      'Most weddings take place in dedicated wedding halls, with a short ceremony followed by a buffet. Guests hand a cash envelope to a reception desk and receive a meal ticket in return.',
      ['The ceremony itself often lasts under an hour.', 'A traditional pyebaek ritual in hanbok may follow for family.'],
      'Guest lists are large, like India, but the whole event is over in an afternoon.',
    ),
    food: topic(
      'Rice, soup, and a table full of side dishes.',
      'Meals come with banchan, small shared side dishes, with kimchi nearly always among them. Food delivery is fast and reaches parks and riverbanks, not just homes.',
      ['Metal chopsticks and a long spoon are the standard set.', 'The youngest at the table usually pours drinks for elders.'],
      'Sharing dishes from the centre of the table is common to both. Spice levels are high in both, in very different ways.',
      'Korean fried chicken with a cold drink, a pairing known as chimaek.',
    ),
    housing: topic(
      'High-rise living and a deposit like no other.',
      'Most city families live in large apartment complexes. A distinctive rental system, jeonse, lets tenants pay one very large deposit instead of monthly rent and get it back when they leave.',
      ['Heated floors, called ondol, warm homes in winter.', 'Shoes come off at the door.'],
      'Apartment towers resemble Indian metro societies, but households are about half the size.',
    ),
    transport: topic(
      'One card, every train and bus.',
      'Seoul\'s subway is extensive, clean and cheap, and a single transit card covers buses and trains with free transfers. Station announcements and signs come in several languages.',
      ['Subway seats are heated in winter.', 'Priority seats for the elderly are left empty even when crowded.'],
      'Commute times are close to an Indian metro, with far more of the journey on rail.',
    ),
  },
  facts: [
    'On the day of South Korea\'s university entrance exam, planes are grounded during the English listening test.',
    'With jeonse, a Korean tenant can pay one large deposit and no monthly rent at all.',
  ],
  quizClues: [
    'Tenants can rent a flat by paying one huge refundable deposit instead of monthly rent.',
    'Flights are paused during the national university entrance exam.',
    'Almost every meal comes with kimchi.',
  ],
  sources: COUNTRY_SOURCES,
};

export default southKorea;
