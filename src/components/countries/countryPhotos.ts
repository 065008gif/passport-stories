/**
 * Real photographs for the Countries directory preview: everyday life,
 * people, streets, markets and landscapes rather than famous monuments.
 * All from Pexels (free to use under the Pexels licence; credited on the page).
 * Swap a photo by changing its id: the number in any pexels.com/photo/... address.
 */
export interface CountryPhoto {
  id: number;
  alt: string;
  caption: string;
  credit: string;
}

export const COUNTRY_PHOTOS: Record<string, CountryPhoto> = {
  japan: { id: 36966151, alt: 'Friends picnicking under cherry blossoms by a canal while a train passes overhead', caption: 'Hanami: picnics under the cherry blossoms', credit: '貴彦 佐藤' },
  india: { id: 40536246, alt: 'Vendors selling fresh produce at a busy street market in Mumbai', caption: 'A morning street market in Mumbai', credit: 'atelierbyvineeth' },
  italy: { id: 13784008, alt: 'People dining outdoors in Piazza delle Erbe, Verona', caption: 'Long lunches in a piazza in Verona', credit: 'Helena Jankovičová Kováčová' },
  mexico: { id: 16625366, alt: 'A street in San Miguel de Allende strung with colourful papel picado', caption: 'Papel picado over San Miguel de Allende', credit: 'Jorge Acre' },
  china: { id: 28890198, alt: 'A crowded street hung with red lanterns during a night festival', caption: 'A festival night under red lanterns', credit: '征宇 郑' },
  'south-korea': { id: 37538114, alt: 'Friends in hanbok crossing a rainy street in Seoul under umbrellas', caption: 'Hanbok and umbrellas on a rainy Seoul street', credit: 'Trac Vu' },
  singapore: { id: 30210592, alt: 'Diners sharing local dishes at a busy hawker centre in Singapore', caption: 'Supper at a hawker centre', credit: 'Namzy' },
  uae: { id: 28515826, alt: 'Sacks of colourful spices in a traditional souq in Dubai', caption: 'The spice souq in old Dubai', credit: 'Kate Trysh' },
  egypt: { id: 15062842, alt: 'A market stall of fresh produce on a busy Cairo street', caption: 'A neighbourhood market in Cairo', credit: 'irwan zahuri' },
  france: { id: 30132163, alt: 'People sitting outside a cafe by the Palais Royal in Paris on a sunny day', caption: 'Coffee outside a Paris cafe', credit: 'Fleur van Deijck' },
  germany: { id: 37773716, alt: 'People sharing drinks on a summer day in a Munich beer garden', caption: 'A summer afternoon in a Munich beer garden', credit: 'Ezgi Kaya' },
  netherlands: { id: 32876398, alt: 'Bicycles parked on a bridge over an Amsterdam canal lined with old houses', caption: 'Bikes on a canal bridge in Amsterdam', credit: 'Hans' },
  'united-kingdom': { id: 12504321, alt: 'A quiet street of London terraced houses at dusk', caption: 'Terraced houses on a London street at dusk', credit: 'Daniel Sikpi' },
  usa: { id: 12157315, alt: "People and classic cars on a street in New York's Little Italy", caption: "A Saturday in New York's Little Italy", credit: 'Malcolm Hill' },
  sweden: { id: 35729258, alt: 'Crowds by the water watching sailboats in Stockholm in summer', caption: 'Summer by the water in Stockholm', credit: 'Shakir Mohamed' },
  finland: { id: 4081124, alt: 'A red cabin by a lake surrounded by autumn forest in Finland', caption: 'A lakeside cabin in the Finnish autumn', credit: 'Olivier Darny' },
  canada: { id: 16451837, alt: 'A canoeist and a dog on a calm lake in autumn in Canada', caption: 'Paddling through autumn colour', credit: 'Elvis Fernandez' },
  brazil: { id: 2559997, alt: 'Friends playing football on Copacabana beach at sunset', caption: 'Football on Copacabana at sunset', credit: 'Vinícius Vieira ft' },
  australia: { id: 37073077, alt: 'People enjoying a sunny day at Bondi Beach in Sydney', caption: 'A sunny day at Bondi Beach', credit: 'Talha Resitoglu' },
  'south-africa': { id: 36492378, alt: 'Pink and yellow houses on a street in Bo-Kaap, Cape Town', caption: 'The colourful streets of Bo-Kaap, Cape Town', credit: 'Ndumiso Zimu' },
};

export const photoUrl = (id: number, w: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
export const photoSet = (id: number) => [800, 1280, 1920].map((w) => `${photoUrl(id, w)} ${w}w`).join(', ');
