import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const italy: Country = {
  slug: 'italy',
  name: 'Italy',
  isoNumeric: '380',
  flag: '🇮🇹',
  airport: 'FCO',
  region: 'Europe',
  tagline: 'Coffee standing up, dinner sitting down for hours.',
  geo: { lat: 42.8, lng: 12.5 },
  quickFacts: { population: 'About 59 million', capital: 'Rome', currency: 'Euro (€)', language: 'Italian' },
  metrics: {
    workHours: s(36), paidLeave: s(20), schoolStartAge: s(6), schoolDayHours: s(5.5),
    weddingDays: s(1), weddingGuests: s(110), dinnerTime: s(20.5), householdSize: s(2.3),
    homeOwnership: s(74), commuteMinutes: s(30), publicTransportShare: s(12),
  },
  life: {
    currencyCode: 'EUR', currencySymbol: '€', perINR: s(0.0108), costIndex: s(250), rentShare: s(28),
    weekend: 'An espresso at the bar, Sunday lunch at your grandmother\'s, and an evening stroll with everyone in town.',
  },
  topics: {
    'work-life-balance': topic(
      'The whole country closes in August.',
      'Around the mid-August holiday of Ferragosto, many offices and shops shut and cities empty towards the coast. In smaller towns, a long midday break still splits the working day.',
      ['A coffee break at the bar takes two minutes and happens often.', 'Family comes first in scheduling.'],
      'Shorter hours and a long shared summer break, with a family-first attitude that feels familiar.',
    ),
    'school-day': topic(
      'Mornings only, sometimes on Saturday.',
      'Many schools run from about 8 am to early afternoon, and some include Saturday mornings. Students are regularly tested with oral exams in front of the class.',
      ['Lunch is usually eaten at home.', 'School ends with the Maturità exam.'],
      'A shorter day and no uniform in most schools. Oral exams replace much of the written testing.',
    ),
    weddings: topic(
      'Sugared almonds and a meal with many chapters.',
      'Weddings revolve around a long, multi-course meal that can last for hours. Guests go home with bomboniere, small gifts with sugared almonds.',
      ['Church weddings remain common.', 'Guests throw rice as the couple leaves the ceremony.'],
      'One day rather than several, but the focus on feeding guests generously is the same.',
    ),
    food: topic(
      'Rules, but delicious ones.',
      'Pasta is a first course, not a side; cappuccino is for the morning; and dinner starts around 8 or later. Each region defends its own recipes.',
      ['Espresso is drunk quickly, standing at the bar.', 'The early-evening aperitivo comes with snacks.'],
      'Dinner time is close to India\'s, and regional food pride is just as fierce.',
      'Cacio e pepe in Rome: pasta, cheese and black pepper, nothing else.',
    ),
    housing: topic(
      'Home until thirty, and why not.',
      'Italians leave the parental home later than almost anyone in Europe, often around thirty. Most families own their home, usually an apartment.',
      ['Sunday lunch with parents continues after moving out.', 'Homes often pass down through families.'],
      'Living with parents into adulthood is as normal here as in India.',
    ),
    transport: topic(
      'Scooters in the alleys, fast trains between cities.',
      'Cars and scooters dominate daily commuting, and historic centres restrict traffic. High-speed trains connect Milan, Rome and Naples in a few hours.',
      ['The Vespa was born here in 1946.', 'Old city centres have limited traffic zones enforced by camera.'],
      'A fellow scooter nation, on a smaller scale and with shorter commutes.',
    ),
  },
  facts: [
    'Ordering a cappuccino after lunch is considered unusual in Italy.',
    'Italians typically leave their parents\' home around the age of thirty.',
  ],
  quizClues: [
    'Young adults here leave the family home later than almost anywhere in Europe.',
    'Wedding guests take home sugared almonds.',
    'Cappuccino is strictly a morning drink.',
  ],
  sources: COUNTRY_SOURCES,
};

export default italy;
