'use client';

/**
 * Community facts: approved facts from visitors, and the form to send one.
 * A new fact is stored as "pending"; it appears here only after someone
 * approves it on the /admin page.
 */
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import CountryPicker, { type PickOption } from '@/components/CountryPicker';
import { flagSrc } from '@/components/Flag';
import { track } from '@/lib/analytics';
import { earnBadge } from '@/lib/passport';

interface PublicFact {
  id: string;
  country: string;
  fact: string;
  name: string;
  created_at: string;
}

const TILTS = ['-rotate-1', 'rotate-1', '-rotate-[0.5deg]', 'rotate-[1.5deg]'];
const TONES = ['#FFD86B', '#9BE0F7', '#8FDCC0', '#FFC08A'];

export default function CommunityFacts({ countries, country, heading = true }: { countries: PickOption[]; country?: string; heading?: boolean }) {
  const [facts, setFacts] = useState<PublicFact[] | null>(null);
  const [pick, setPick] = useState(country || 'japan');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  const nameOf = (slug: string) => countries.find((c) => c.slug === slug)?.name || slug;

  useEffect(() => {
    fetch(`/api/facts${country ? `?country=${country}` : ''}`)
      .then((r) => r.json())
      .then((d) => setFacts(d.facts || []))
      .catch(() => setFacts([]));
  }, [country]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < 20) return setError('Tell us a little more: at least 20 characters.');
    setError('');
    setState('sending');
    try {
      const res = await fetch('/api/facts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ country: pick, fact: text, name, website }) });
      const data = await res.json();
      if (!res.ok) {
        setState('idle');
        return setError(data.error || 'Something went wrong.');
      }
      track('fact_submitted', { country: pick, length: text.trim().length });
      earnBadge('storyteller');
      setState('sent');
      setText('');
    } catch {
      setState('idle');
      setError('Could not reach the server. Please try again.');
    }
  };

  return (
    <section data-section={country ? 'community-facts:country' : 'community-facts'} aria-labelledby="community-title">
      {heading && (
        <>
          <p className="kicker text-sun" data-rv="up">
            From our travellers
          </p>
          <h2 id="community-title" className="h-display mt-1 text-3xl sm:text-5xl" data-rv="up">
            {country ? `What visitors say about ${nameOf(country)}` : 'Interesting facts from our users'}
          </h2>
        </>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Wall of approved facts */}
        <div>
          {facts === null ? (
            <p className="font-mono text-sm text-cream/60">Loading facts…</p>
          ) : facts.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-cream/25 p-8 text-center">
              <p className="text-4xl" aria-hidden>
                ✍️
              </p>
              <p className="h-display mt-2 text-2xl">No facts here yet.</p>
              <p className="mt-1 text-cream/75">Lived there, studied there, or just know something odd? Yours could be the first.</p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {facts.map((f, i) => (
                <li key={f.id} data-rv="pop" style={{ ['--d' as string]: `${Math.min(i, 6) * 70}ms` }}>
                  <div className={`h-full rounded-2xl p-4 text-ink shadow-[0_10px_24px_-14px_rgba(27,31,94,.4)] transition-transform duration-200 hover:rotate-0 hover:scale-[1.03] ${TILTS[i % TILTS.length]}`} style={{ background: TONES[i % TONES.length] }}>
                    <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={flagSrc(f.country)} alt="" width={22} height={22} className="h-[22px] w-[22px] rounded-full object-cover ring-2 ring-ink/30" />
                      {nameOf(f.country)}
                    </p>
                    <p className="mt-2 text-[17px] font-bold leading-snug">“{f.fact}”</p>
                    <p className="mt-3 text-sm font-semibold opacity-80">— {f.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submit */}
        <div className="rounded-3xl border border-cream/20 bg-night/70 p-5 backdrop-blur" data-rv="right">
          <AnimatePresence mode="wait">
            {state === 'sent' ? (
              <motion.div key="sent" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-6 text-center" role="status">
                <p className="text-5xl" aria-hidden>
                  📮
                </p>
                <p className="h-display mt-3 text-2xl">Got it. Thank you!</p>
                <p className="mt-2 text-cream/85">We will review and publish your fact within 24 hours.</p>
                <button onClick={() => setState('idle')} className="btn btn-ghost mt-5">
                  Send another
                </button>
              </motion.div>
            ) : (
              <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} noValidate>
                <p className="h-display text-2xl">Know something we don&rsquo;t?</p>
                <p className="mt-1 text-sm text-cream/75">Share one interesting fact about everyday life in a country. We check each one before it goes up.</p>
                {!country && (
                  <div className="mt-4">
                    <CountryPicker label="Country" name="fact-country" options={countries} value={pick} onChange={setPick} />
                  </div>
                )}
                <label className="mt-4 block">
                  <span className="kicker mb-1 block text-cream/80">Your fact</span>
                  <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 280))} rows={4} placeholder={`In ${nameOf(pick)}, people…`} className="w-full rounded-2xl border-2 border-cream/25 bg-night p-3 text-base font-semibold text-cream placeholder:font-normal placeholder:text-cream/40 focus:border-sun" />
                  <span className={`mt-1 block text-right font-mono text-[11px] ${text.length > 250 ? 'text-coral' : 'text-cream/55'}`}>{text.length}/280</span>
                </label>
                <label className="block">
                  <span className="kicker mb-1 block text-cream/80">Your first name (optional)</span>
                  <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="A traveller" className="h-11 w-full rounded-full border-2 border-cream/25 bg-night px-4 font-semibold text-cream placeholder:font-normal placeholder:text-cream/40 focus:border-sun" />
                </label>
                {/* Hidden from people; bots fill it in and get ignored. */}
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" className="hidden" aria-hidden />
                <button type="submit" disabled={state === 'sending'} className="btn btn-sun mt-4 w-full">
                  {state === 'sending' ? 'Sending…' : 'Send my fact →'}
                </button>
                <p role="alert" className="mt-2 min-h-5 text-sm font-semibold text-coral">
                  {error}
                </p>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
