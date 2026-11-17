import type { Metadata } from 'next';
import { COUNTRIES } from '@/data/countries';
import Breadcrumbs from '@/components/Breadcrumbs';
import PassportClient from '@/components/passport/PassportClient';
import { Poster } from '@/components/Visuals';

export const metadata: Metadata = {
  title: 'Your Passport',
  description: 'Every country you explore earns a stamp. Collect all 20, plus badges from the quiz and the home flight.',
};

export default function PassportPage() {
  return (
    <>
    <section className="relative overflow-hidden">
      <Poster code="ID" />
      <div className="container-x relative pb-16 pt-2">
        <Breadcrumbs items={[{ label: 'Your Passport' }]} />
        <p className="kicker mt-6 text-sun">Your Passport</p>
        <h1 className="chunk mt-2 text-4xl sm:text-6xl">Stamps, badges, bragging rights.</h1>
      </div>
    </section>
    <div className="deck py-12">
      <div className="container-x">
        <PassportClient countries={COUNTRIES.map(({ slug, name, flag, airport }) => ({ slug, name, flag, airport }))} />
      </div>
    </div>
    </>
  );
}
