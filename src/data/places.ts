/**
 * Real photos and atlas facts for the home page: the hero collage, the
 * globe's hover cards and the country slider.
 *
 * Photos are free to use under the Pexels licence and load straight from
 * the Pexels CDN, resized on the fly (?w=...). Change a photo by swapping
 * its id: the number at the end of any pexels.com/photo/... address.
 */
export interface Place {
  /** Pexels photo id. */
  photo: number;
  /** What the photo shows, also used as alt text. */
  alt: string;
  /** Short label shown on the photo. */
  spot: string;
  /** Land area in square kilometres. */
  area: number;
  /** One interesting, checkable fact. */
  fact: string;
}

export const pexels = (id: number, w = 800) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
export const pexelsSet = (id: number, widths = [480, 800, 1200]) => widths.map((w) => `${pexels(id, w)} ${w}w`).join(', ');

export const PLACES: Record<string, Place> = {
  india: { photo: 3224533, alt: 'The Taj Mahal and its reflecting pool under a bright blue sky', spot: 'Agra', area: 3287263, fact: 'The constitution recognises 22 scheduled languages.' },
  japan: { photo: 12544861, alt: 'Chureito Pagoda with cherry blossoms and Mount Fuji behind', spot: 'Fujiyoshida', area: 377975, fact: 'A 2023 recount found 14,125 islands, double the old figure.' },
  'south-korea': { photo: 12176008, alt: 'Visitors in hanbok at Gyeongbokgung Palace in Seoul', spot: 'Seoul', area: 100410, fact: 'In 2023 the country dropped its traditional age count and adopted international age.' },
  china: { photo: 3892447, alt: 'The Great Wall winding over green mountains', spot: 'Beijing', area: 9596961, fact: 'The whole country runs on a single time zone.' },
  singapore: { photo: 3881761, alt: 'The Supertree Grove at Gardens by the Bay under a blue sky', spot: 'Marina Bay', area: 735, fact: 'One of only three city states left in the world.' },
  uae: { photo: 1537493, alt: 'Aerial view of the Dubai skyline with the Burj Khalifa', spot: 'Dubai', area: 83600, fact: 'The Burj Khalifa, at 828 metres, is the tallest building on Earth.' },
  germany: { photo: 404313, alt: 'Neuschwanstein Castle above the Bavarian forest', spot: 'Bavaria', area: 357592, fact: 'Long stretches of the Autobahn have no general speed limit.' },
  france: { photo: 532826, alt: 'The Eiffel Tower against a clear blue sky', spot: 'Paris', area: 643801, fact: 'It welcomes more international tourists than any other country.' },
  italy: { photo: 1296204, alt: 'Amalfi harbour with colourful houses on the cliffs', spot: 'Amalfi Coast', area: 301340, fact: 'It has more UNESCO World Heritage Sites than almost any country.' },
  'united-kingdom': { photo: 26568603, alt: 'Big Ben and a red double decker bus in London', spot: 'London', area: 243610, fact: 'The London Underground, opened in 1863, is the oldest metro in the world.' },
  netherlands: { photo: 2031706, alt: 'Boats and bicycles along an Amsterdam canal', spot: 'Amsterdam', area: 41543, fact: 'About a quarter of the land lies below sea level.' },
  sweden: { photo: 29138603, alt: 'Colourful old buildings on Stortorget square in Gamla Stan', spot: 'Stockholm', area: 450295, fact: 'The right of public access lets anyone walk and camp on most land.' },
  finland: { photo: 91216, alt: 'A red wooden cabin under the northern lights', spot: 'Lapland', area: 338455, fact: 'There are an estimated three million saunas for 5.6 million people.' },
  usa: { photo: 1054417, alt: 'Yellow taxis and skyscrapers in Times Square, New York', spot: 'New York', area: 9833520, fact: 'Yellowstone, created in 1872, is often called the first national park.' },
  canada: { photo: 2662116, alt: 'Turquoise Moraine Lake below the Rocky Mountains', spot: 'Banff', area: 9984670, fact: 'It has the longest coastline of any country.' },
  brazil: { photo: 351283, alt: 'Sugarloaf Mountain rising over boats in Guanabara Bay', spot: 'Rio de Janeiro', area: 8515767, fact: 'About 60 percent of the Amazon rainforest lies inside Brazil.' },
  mexico: { photo: 18965554, alt: 'Colourful houses on a hillside street in Guanajuato', spot: 'Guanajuato', area: 1964375, fact: 'Mexico City is built on the bed of an old lake, Lake Texcoco.' },
  australia: { photo: 2434267, alt: 'Aerial view of the Sydney Opera House and ferries in the harbour', spot: 'Sydney', area: 7692024, fact: 'From east to west it is wider than the Moon.' },
  'south-africa': { photo: 4098987, alt: 'Table Mountain at sunset behind a field of wildflowers', spot: 'Cape Town', area: 1219090, fact: "Table Mountain alone has more plant species than the whole of the UK." },
  egypt: { photo: 71241, alt: 'Camels walking past the Pyramids of Giza', spot: 'Giza', area: 1001450, fact: 'The Great Pyramid was the tallest structure built by people for nearly 4,000 years.' },
};

/** Extra moments for the hero: festivals, food and street life. */
export const MOMENTS = {
  holi: { photo: 3367459, alt: 'A crowd celebrating Holi covered in coloured powder', spot: 'Holi, India' },
  hawker: { photo: 13967613, alt: 'Cooks at a busy hawker stall in Singapore', spot: 'Hawker food, Singapore' },
};

export function formatArea(km2: number) {
  if (km2 >= 1_000_000) return `${(km2 / 1_000_000).toFixed(2).replace(/0$/, '')} million km²`;
  return `${km2.toLocaleString('en-IN')} km²`;
}
