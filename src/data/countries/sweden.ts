import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const sweden: Country = {
  slug: 'sweden',
  name: 'Sweden',
  isoNumeric: '752',
  flag: '🇸🇪',
  airport: 'ARN',
  region: 'Europe',
  tagline: 'Coffee breaks are scheduled, and so is the laundry room.',
  geo: { lat: 62, lng: 15 },
  quickFacts: { population: 'About 10.5 million', capital: 'Stockholm', currency: 'Swedish krona (kr)', language: 'Swedish' },
  metrics: {
    workHours: s(36), paidLeave: s(25), schoolStartAge: s(6), schoolDayHours: s(6),
    weddingDays: s(1), weddingGuests: s(70), dinnerTime: s(18), householdSize: s(2.2),
    homeOwnership: s(64), commuteMinutes: s(30), publicTransportShare: s(22),
  },
  life: {
    currencyCode: 'SEK', currencySymbol: 'kr ', perINR: s(0.115), costIndex: s(270), rentShare: s(26),
    weekend: 'A cinnamon bun and coffee with friends, a few hours in the forest, and tacos on the sofa on Friday night.',
  },
  topics: {
    'work-life-balance': topic(
      'Fika is not optional.',
      'The working day includes fika, a coffee-and-pastry break taken together. Employees get at least 25 days of leave, and parents share 480 days of paid parental leave per child.',
      ['Leaving at 4 pm to collect children is unremarkable.', 'Offices are quiet for much of July.'],
      'Around ten fewer hours a week, and parental leave on a scale few countries match.',
    ),
    'school-day': topic(
      'First names for teachers, free lunch for all.',
      'Students call teachers by their first name and every child gets a free hot lunch. Formal grades do not begin until the sixth year of school.',
      ['No uniforms.', 'Outdoor breaks happen in all weather.'],
      'No uniform, no "sir" or "ma\'am", and no marks for the first several years.',
    ),
    weddings: topic(
      'Walk in together, kiss the guests.',
      'Couples often walk down the aisle side by side. At the dinner, if one partner leaves the room, guests may queue to kiss the other on the cheek.',
      ['Many couples live together for years without marrying.', 'Guests give speeches, coordinated by a toastmaster.'],
      'Small, informal and single-day, with living together before marriage widely accepted.',
    ),
    food: topic(
      'Sweets on Saturday, tacos on Friday.',
      'Dinner is early, around 6 pm. Two weekly rituals stand out: a cosy Friday night that often means tacos, and Saturday sweets from pick-and-mix walls.',
      ['Crispbread and open sandwiches are everyday food.', 'Lunch restaurants offer a fixed "dish of the day".'],
      'Dinner is three hours earlier and milder in every sense.',
      'Meatballs with mashed potato and lingonberry jam.',
    ),
    housing: topic(
      'Living alone, booking the laundry.',
      'Sweden has one of the highest shares of single-person households in the world. Apartment buildings share a laundry room that residents book by time slot.',
      ['Many families have access to a summer cottage.', 'Young people move out soon after school.'],
      'Half the household size, and living alone is the most common arrangement.',
    ),
    transport: topic(
      'An art gallery that runs on rails.',
      'Stockholm\'s metro stations are decorated with paintings and sculptures, earning it the nickname of the world\'s longest art exhibition. Cycling and public transport are common, and the city charges a congestion fee.',
      ['Cash is rarely used, even on buses.', 'Winter cycling is normal.'],
      'Shorter commutes, cleaner air, and almost no cash.',
    ),
  },
  facts: [
    'Swedish parents share 480 days of paid parental leave per child.',
    'Stockholm\'s metro is often called the world\'s longest art exhibition.',
  ],
  quizClues: [
    'Apartment residents book time slots in a shared laundry room.',
    'Friday night at home often means tacos.',
    'The daily coffee-and-pastry break is called fika.',
  ],
  sources: COUNTRY_SOURCES,
};

export default sweden;
