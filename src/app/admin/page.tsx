import type { Metadata } from 'next';
import { COUNTRIES } from '@/data/countries';
import AdminClient from '@/components/admin/AdminClient';

export const metadata: Metadata = { title: 'Back office', robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="deck min-h-[80svh] py-10">
      <div className="container-x">
        <AdminClient names={Object.fromEntries(COUNTRIES.map((c) => [c.slug, c.name]))} />
      </div>
    </div>
  );
}
