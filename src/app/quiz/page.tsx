import type { Metadata } from 'next';
import { COUNTRIES } from '@/data/countries';
import Breadcrumbs from '@/components/Breadcrumbs';
import QuizClient from '@/components/quiz/QuizClient';
import { Poster } from '@/components/Visuals';

export const metadata: Metadata = {
  title: 'Play Zone: three quick country games',
  description: 'Clue Chase, Higher or Lower and Flag Run. No timers. Earn XP, level up, keep a daily streak and share your score.',
};

export default function QuizPage() {
  return (
    <>
    <section className="relative overflow-hidden">
      <Poster code="?" />
      <div className="container-x relative pb-16 pt-2">
        <Breadcrumbs items={[{ label: 'Play Zone' }]} />
        <p className="kicker mt-6 text-sun">Play Zone · three games · no clocks, no rush</p>
        <h1 className="chunk mt-2 text-4xl sm:text-6xl">
          How well do you know <span className="text-sun">the world?</span>
        </h1>
      </div>
    </section>
    <div className="deck min-h-[60svh] py-12">
      <div className="container-x">
        <QuizClient countries={COUNTRIES.map(({ slug, name, airport, quizClues, metrics }) => ({ slug, name, airport, clues: quizClues, stats: Object.fromEntries(Object.entries(metrics).map(([k, v]) => [k, v.value])) }))} />
      </div>
    </div>
    </>
  );
}
