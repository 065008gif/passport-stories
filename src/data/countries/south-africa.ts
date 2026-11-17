import type { Country } from '../types';
import { COUNTRY_SOURCES, s, topic } from '../helpers';

const southAfrica: Country = {
  slug: 'south-africa',
  name: 'South Africa',
  isoNumeric: '710',
  flag: '🇿🇦',
  airport: 'JNB',
  region: 'Africa',
  tagline: 'Twelve official languages and one shared fire on Saturday.',
  geo: { lat: -29, lng: 24 },
  quickFacts: { population: 'About 62 million', capital: 'Pretoria, Cape Town and Bloemfontein', currency: 'South African rand (R)', language: '12 official languages including isiZulu, isiXhosa, Afrikaans and English' },
  metrics: {
    workHours: s(42), paidLeave: s(15), schoolStartAge: s(7), schoolDayHours: s(6),
    weddingDays: s(2), weddingGuests: s(150), dinnerTime: s(19), householdSize: s(3.3),
    homeOwnership: s(70), commuteMinutes: s(45), publicTransportShare: s(25),
  },
  life: {
    currencyCode: 'ZAR', currencySymbol: 'R', perINR: s(0.21), costIndex: s(140), rentShare: s(28),
    weekend: 'A braai that starts at noon and ends after dark, rugby or football on the radio, and a drive somewhere with a view.',
  },
  topics: {
    'work-life-balance': topic(
      'Early starts and December at the coast.',
      'The working day often begins early. Many businesses slow down or close from mid-December into January, when families head to the coast or back to their home towns.',
      ['Statutory leave is 21 consecutive days a year.', 'Heritage Day in September is widely celebrated with a barbecue.'],
      'Slightly shorter hours and similar leave, with one long shared summer break in December.',
    ),
    'school-day': topic(
      'Strict uniforms, many languages.',
      'Uniforms are standard and closely checked. The school year runs from January to December, and children are often taught in their home language first before switching to English.',
      ['School sport, especially rugby, cricket and netball, is a big deal.', 'The final school exam is called matric.'],
      'Uniforms, a single big school-leaving exam and multilingual classrooms are all familiar.',
    ),
    weddings: topic(
      'Two families negotiate, then two celebrations.',
      'In many communities the families first negotiate lobola, a gift from the groom\'s family to the bride\'s. Couples often hold both a traditional wedding and a "white wedding", sometimes on different days.',
      ['Guests sing and dance the couple in.', 'Traditional dress varies by community and is vividly colourful.'],
      'Family negotiations and more than one ceremony make this feel closer to India than most.',
    ),
    food: topic(
      'If in doubt, braai.',
      'The braai, a wood or charcoal barbecue, is the social centre of the weekend. Pap, a maize porridge, is a staple, and Durban\'s famous curry in a hollowed loaf has Indian roots.',
      ['Rooibos tea is a local favourite.', 'Dried cured meat, biltong, is the national snack.'],
      'Dinner is about two hours earlier. Durban has one of the largest Indian-origin communities outside India.',
      'Bunny chow: curry served in a hollowed-out loaf of bread.',
    ),
    housing: topic(
      'Many kinds of home, often shared across generations.',
      'Housing ranges from suburban houses to township homes and rural homesteads. Extended families commonly share a home or a plot.',
      ['Gated estates are common in cities.', 'Many workers support family in another province.'],
      'Extended-family households are familiar, and average household size is closer to India\'s than Europe\'s.',
    ),
    transport: topic(
      'Hand signals for the minibus.',
      'Minibus taxis carry the majority of public transport users. Passengers flag them down with hand signals that indicate where they want to go.',
      ['Fares are passed forward hand to hand.', 'A fast train, the Gautrain, links Johannesburg, Pretoria and the airport.'],
      'Long commutes and shared vehicles are common to both, like a shared auto on a bigger scale.',
    ),
  },
  facts: [
    'South African commuters use hand signals to tell minibus taxis where they want to go.',
    'South Africa has three capital cities.',
  ],
  quizClues: [
    'Commuters use hand signals to hail a minibus going their way.',
    'It has three capital cities.',
    'The weekend barbecue is called a braai.',
  ],
  sources: COUNTRY_SOURCES,
};

export default southAfrica;
