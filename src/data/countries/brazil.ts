import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const brazil: Country = {
  slug: 'brazil',
  name: 'Brazil',
  isoNumeric: '076',
  flag: '🇧🇷',
  airport: 'GRU',
  region: 'Americas',
  tagline: 'Rice, beans, football, and a party that starts late.',
  geo: { lat: -10, lng: -52 },
  quickFacts: { population: 'About 213 million', capital: 'Brasília', currency: 'Brazilian real (R$)', language: 'Portuguese' },
  metrics: {
    workHours: s(39), paidLeave: s(30), schoolStartAge: s(4), schoolDayHours: s(4.5),
    weddingDays: s(1), weddingGuests: s(150), dinnerTime: s(20), householdSize: s(2.8),
    homeOwnership: s(71), commuteMinutes: s(40), publicTransportShare: s(28),
  },
  life: {
    currencyCode: 'BRL', currencySymbol: 'R$', perINR: s(0.063), costIndex: s(130), rentShare: s(30),
    weekend: 'A long barbecue with the extended family, music from someone\'s speaker, and the beach or a football match to finish.',
  },
  topics: {
    'work-life-balance': topic(
      'Thirty days off and a thirteenth salary.',
      'Formal employees are entitled to thirty days of annual leave and an extra month\'s pay at the end of the year. Lunch is a proper meal, usually an hour long.',
      ['Carnival brings much of the country to a stop.', 'Greetings at work are warm and personal.'],
      'Twice the paid leave, plus a year-end bonus written into law.',
    ),
    'school-day': topic(
      'Morning shift or afternoon shift.',
      'Many schools teach in half-day shifts, so students attend either in the morning or the afternoon. Schooling is compulsory from age four.',
      ['Uniforms are usually a simple school T-shirt.', 'A national exam, the ENEM, opens the door to university.'],
      'A shorter school day in shifts, and a single national entrance exam similar in role to CUET or JEE.',
    ),
    weddings: topic(
      'Many godparents and a table of sweets.',
      'Couples choose several pairs of padrinhos, honoured friends and relatives who stand with them. The party runs late, with a lavish sweets table and small wrapped cakes for guests to take home.',
      ['Receptions rarely end before the early hours.', 'Guests may be handed flip-flops for the dance floor.'],
      'Fewer guests and one night, but the same commitment to food, music and dancing.',
    ),
    food: topic(
      'Rice and beans, every single day.',
      'Lunch is the main meal and almost always includes rice and beans. Self-service restaurants that charge by the weight of your plate are a weekday staple.',
      ['Coffee is small, strong and frequent.', 'The weekend barbecue is called churrasco.'],
      'Rice with a pulse at the centre of the plate is a daily habit in both countries.',
      'Pão de queijo, warm cheese bread, with a small coffee.',
    ),
    housing: topic(
      'A doorman downstairs.',
      'City families commonly live in apartment buildings with a doorman and shared leisure areas. Young adults often stay with their parents until they marry.',
      ['Gated condominiums are common.', 'Sunday lunch gathers the whole family.'],
      'Staying with parents until marriage is familiar, as are gated societies.',
    ),
    transport: topic(
      'The bus carries the country.',
      'Buses are the backbone of urban transport, and the city of Curitiba pioneered bus rapid transit, with tube-shaped stations and dedicated lanes. São Paulo has a busy metro and famous traffic.',
      ['Motorbike couriers weave through city traffic.', 'App-based rides are widely used.'],
      'Long commutes, crowded buses and motorbikes between the lanes will all feel like home.',
    ),
  },
  facts: [
    'Brazilian workers receive a legally required "thirteenth salary" each year.',
    'Many Brazilian restaurants charge by the weight of the food on your plate.',
  ],
  quizClues: [
    'Restaurants weigh your plate to work out the bill.',
    'Workers receive a legally required thirteenth salary.',
    'Carnival brings the country to a halt each year.',
  ],
  sources: COUNTRY_SOURCES,
};

export default brazil;
