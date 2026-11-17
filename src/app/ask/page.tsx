import type { Metadata } from 'next';
import Breadcrumbs from '@/components/Breadcrumbs';
import AskForm from '@/components/ask/AskForm';
import { Poster } from '@/components/Visuals';

export const metadata: Metadata = {
  title: 'Ask the Map',
  description: 'Suggest the next country or topic for Passport Stories.',
};

export default function AskPage() {
  return (
    <>
    <section className="relative overflow-hidden">
      <Poster code="ASK" />
      <div className="container-x relative pb-16 pt-2">
        <Breadcrumbs items={[{ label: 'Ask the Map' }]} />
        <p className="kicker mt-6 text-sun">Ask the Map</p>
        <h1 className="chunk mt-2 text-4xl sm:text-6xl">Where should we fly next?</h1>
        <p className="mt-3 max-w-xl text-lg text-cream/90">Twenty countries is a start. Tell us which country or slice of everyday life you want to see on the map.</p>
      </div>
    </section>
    <div className="deck py-12">
      <div className="container-x">
        <AskForm />
      </div>
    </div>
    </>
  );
}
