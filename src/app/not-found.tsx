import Link from 'next/link';
import { Poster } from '@/components/Visuals';

/** 404 page. */
export default function NotFound() {
  return (
    <section className="relative flex min-h-[80svh] items-center">
      <Poster code="404" />
      <div className="container-x relative py-20">
        <p className="kicker text-sun">Flight not found</p>
        <h1 className="h-display mt-2 text-5xl sm:text-7xl">This page missed its connection.</h1>
        <p className="mt-4 max-w-lg text-lg text-cream/90">The link may be old, or the page may have moved to another gate.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-sun">
            Back to the globe →
          </Link>
          <Link href="/countries" className="btn btn-ghost">
            All countries
          </Link>
        </div>
      </div>
    </section>
  );
}
