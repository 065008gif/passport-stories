import type { Metadata } from 'next';
import { YourLifeView } from './shared';

export const metadata: Metadata = {
  title: 'Your Life in Another Country',
  description: 'Enter your salary, rent, work hours and commute, pick a country, and get a boarding pass showing what your life could look like there.',
};

export default function YourLifePage() {
  return (
    <YourLifeView
      crumbs={[{ label: 'Your Life' }]}
      heading={
        <>
          Same you. <span className="text-sun">Different country.</span>
        </>
      }
    />
  );
}
