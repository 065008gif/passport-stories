'use client';

/**
 * Your Life in Another Country (the signature feature).
 *
 * Flow: fill in the check-in form -> we save the numbers in this browser
 * (never on a server) -> /your-life/<country> shows the result as a
 * boarding pass -> one tap to try another country or download a story card.
 */
import Flag from '@/components/Flag';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { track } from '@/lib/analytics';
import { earnBadge } from '@/lib/passport';
import { downloadStoryCard } from '@/lib/shareCard';
import { type LifeCountry, type LifeInputs, computeLife, loadInputs, money, rupees, saveInputs } from '@/lib/yourLife';
import BoardingPass from '../BoardingPass';
import { PrintReveal, PrintingOverlay, markPrinting, takePrinting } from './PrintMachine';


const hoursMood = (h: number) => (h <= 30 ? '🌴 Practically Dutch' : h <= 40 ? '🙂 A European sort of week' : h <= 48 ? '💼 A standard Indian week' : h <= 60 ? '😮‍💨 Long days' : '🫠 Do you sleep?');
const commuteMood = (m: number) => (m === 0 ? '🛋️ Work from home' : m <= 30 ? '🚶 A lucky short hop' : m <= 75 ? '🚇 About normal' : m <= 120 ? '🚌 A real trek' : '🥲 That is a part-time job');

/** A big slider row on a coloured lane: label, a huge live number, and a one-line reaction. */
function Slider({ label, unit, min, max, step = 1, value, onChange, mood }: { label: string; unit: string; min: number; max: number; step?: number; value: string; onChange: (v: string) => void; mood: (n: number) => string }) {
  const n = Number(value) || 0;
  const pct = Math.max(0, Math.min(100, ((n - min) / (max - min)) * 100));
  const nudge = (d: number) => onChange(String(Math.max(min, Math.min(max, n + d))));
  const BTN = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[3px] border-ink bg-paper text-xl font-bold text-ink shadow-[0_3px_0_#2B1B3D] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none';
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-ink/75">{label}</label>
        <span className="rounded-full bg-ink px-3 py-1 text-sm font-bold text-cream" aria-live="polite">
          {mood(n)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 sm:gap-4">
        <p className="chunk w-[4.6ch] shrink-0 text-[2rem] leading-none tabular-nums text-ink sm:w-[5ch] sm:text-[2.4rem]">
          {n}
          <span className="ml-1 font-sans text-base font-bold text-ink/70">{unit}</span>
        </p>
        <button type="button" onClick={() => nudge(-step)} className={BTN} aria-label={`Less: ${label}`}>
          −
        </button>
        <input type="range" min={min} max={max} step={step} value={n} onChange={(e) => onChange(e.target.value)} aria-label={label} className="life-range life-range-ink min-w-0 flex-1" style={{ ['--pct' as string]: `${pct}%` }} />
        <button type="button" onClick={() => nudge(step)} className={BTN} aria-label={`More: ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

const inr = (v: string) => (v === '' ? '' : Number(v).toLocaleString('en-IN'));

/** A rupee field written straight onto the ticket: big number, bright underline. */
function Money({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="group block min-w-0">
      <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-ink/75">{label}</span>
      <span className="mt-1.5 flex items-baseline gap-2 rounded-2xl border-[3px] border-ink bg-paper px-3 py-1 sm:mt-2 sm:px-4 sm:py-2 shadow-[0_5px_0_#2B1B3D] transition-transform group-focus-within:-translate-y-0.5">
        <span className="chunk text-2xl text-tang sm:text-3xl">₹</span>
        <input
          className="chunk h-11 min-w-0 flex-1 bg-transparent text-[1.7rem] tabular-nums text-ink placeholder:text-ink/25 focus:outline-none sm:h-12 sm:text-[2.2rem]"
          inputMode="numeric"
          size={1}
          type="text"
          placeholder={placeholder}
          value={inr(value)}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
          required
        />
        <span className="font-mono text-xs font-bold text-ink/55">/ month</span>
      </span>
    </label>
  );
}

/** One lane of the check-in desk: a bright coloured counter with dark ink text. */
function Lane({ n, title, sub, color, children, tilt = 0 }: { n: number; title: string; sub: string; color: string; children: React.ReactNode; tilt?: number }) {
  return (
    <section className="lane relative rounded-[22px] border-[3px] border-ink p-4 text-ink sm:rounded-[24px] sm:p-5" style={{ background: color, transform: `rotate(${tilt}deg)` }}>
      <div className="flex items-center gap-3">
        <span className="chunk flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-base text-sun sm:h-10 sm:w-10 sm:text-lg">{n}</span>
        <div>
          <h2 className="chunk text-xl leading-none sm:text-2xl">{title}</h2>
          <p className="mt-1 text-xs font-semibold text-ink/70 sm:text-sm">{sub}</p>
        </div>
      </div>
      <div className="mt-4 sm:mt-5">{children}</div>
    </section>
  );
}

/** Salary is never sent to analytics, only a broad band. */
const salaryBand = (s: number) => (s < 25000 ? 'under_25k' : s < 50000 ? '25k_50k' : s < 100000 ? '50k_100k' : s < 200000 ? '100k_200k' : 'over_200k');

export default function YourLifeClient({ countries, slug }: { countries: LifeCountry[]; slug?: string }) {
  const router = useRouter();
  const home = countries.find((c) => c.slug === 'india')!;
  const options = countries.filter((c) => c.slug !== 'india');
  const target = options.find((c) => c.slug === slug);

  const [form, setForm] = useState({ salary: '', rent: '', hours: '45', commute: '60', city: '' });
  const [dest, setDest] = useState(slug || 'germany');
  const [saved, setSaved] = useState<LifeInputs | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [reveal, setReveal] = useState(false);

  // Coming from "Print my boarding pass"? Play the printer reveal once.
  useEffect(() => {
    if (takePrinting()) setReveal(true);
  }, []);

  // Start loading the destination page early so the wait is shorter.
  useEffect(() => {
    if (dest && dest !== slug) router.prefetch(`/your-life/${dest}`);
  }, [dest, slug, router]);

  // Bring back the numbers from last time.
  useEffect(() => {
    const i = loadInputs();
    if (!i) return;
    setSaved(i);
    setForm({ salary: String(i.salary), rent: String(i.rent), hours: String(i.hours), commute: String(i.commute), city: i.city });
  }, []);

  const result = target && saved && !editing ? computeLife(saved, target, home) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputs: LifeInputs = {
      salary: Number(form.salary),
      rent: Number(form.rent),
      hours: Number(form.hours),
      commute: Number(form.commute),
      city: form.city.trim() || 'India',
    };
    if (!(inputs.salary > 0)) return setError('Enter your monthly salary in rupees.');
    if (!(inputs.rent >= 0) || form.rent === '') return setError('Enter your monthly rent (0 if you do not pay rent).');
    if (!(inputs.hours > 0 && inputs.hours <= 100)) return setError('Weekly work hours should be between 1 and 100.');
    if (!(inputs.commute >= 0 && inputs.commute <= 600) || form.commute === '') return setError('Daily commute should be between 0 and 600 minutes.');
    setError('');
    saveInputs(inputs);
    setSaved(inputs);
    track('your_life_generated', { country: dest, work_hours: inputs.hours, commute_minutes: inputs.commute, salary_band: salaryBand(inputs.salary) });
    // Show the badge after the pass has printed, not on top of the printer.
    setTimeout(() => earnBadge('parallel-life'), 5600);
    markPrinting();
    setPrinting(true);
    track('pass_print_started', { country: dest });
    if (dest !== slug) {
      setEditing(false);
      // Keep the printer running for at least a moment, even on a fast load.
      setTimeout(() => router.push(`/your-life/${dest}`), 900);
    } else {
      setTimeout(() => {
        setPrinting(false);
        setReveal(takePrinting());
        setEditing(false);
      }, 1600);
      setEditing(true);
      return;
    }
  };

  const tryAnother = () => {
    const others = options.filter((c) => c.slug !== slug);
    const next = others[Math.floor(Math.random() * others.length)];
    track('your_life_generated', { country: next.slug, work_hours: saved?.hours, commute_minutes: saved?.commute, salary_band: salaryBand(saved?.salary || 0), via: 'try_another' });
    router.push(`/your-life/${next.slug}`);
  };

  /* ------------------------------ Result ------------------------------ */
  if (result && saved) {
    const c = result.country;
    const sym = c.life.currencySymbol;
    const hoursDiff = result.hoursNow - result.hoursThere;
    const signed = (n: number, unit: string) => (n === 0 ? `same as now` : `${Math.round(Math.abs(n) * 10) / 10} ${unit} ${n > 0 ? 'fewer' : 'more'} than now`);
    const rows = [
      {
        label: 'Salary to live the same',
        value: `${money(result.matchedSalary, sym)}/mo`,
        note: `Your ${rupees(saved.salary)} converts to ${money(result.convertedSalary, sym)}; prices differ`,
      },
      { label: 'Rent as share of pay', value: `${Math.round(result.rentShareThere)}%`, note: `You pay ${Math.round(result.rentShareNow)}% now` },
      { label: 'Work week', value: `${result.hoursThere} hrs`, note: signed(hoursDiff, 'hrs') },
      { label: 'Paid holidays', value: `${result.holidaysThere} days/yr`, note: `India: ${result.holidaysNow} days` },
      { label: 'Typical commute', value: `${result.commuteThere} min/day`, note: `You: ${result.commuteNow} min/day` },
      {
        label: 'Free time',
        value: `${result.freeHoursPerYear >= 0 ? '+' : '−'}${Math.abs(result.freeHoursPerYear)} hrs/yr`,
        note: 'work and commute combined',
      },
    ];

    const download = async () => {
      setBusy(true);
      await downloadStoryCard({
        filename: `my-life-in-${c.slug}.png`,
        kicker: `From ${saved.city}`,
        title: `My life in ${c.name}`,
        from: 'YOU',
        to: c.airport,
        rows: rows.slice(0, 5).map((r) => ({ label: r.label, value: r.value })),
        quote: result.weekend,
      });
      track('share_card_downloaded', { card_type: 'your_life', country: c.slug });
      setBusy(false);
    };

    return (
      <div className="mx-auto max-w-3xl">
        <PrintReveal play={reveal}>
        <motion.div key={c.slug} initial={reveal ? false : { y: -50, opacity: 0, rotate: -2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 16 }}>
          <BoardingPass kicker="Your life abroad" from={{ code: 'YOU', label: saved.city === 'India' ? 'India' : `${saved.city}, India` }} to={{ code: c.airport, label: c.name }} rows={rows}>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink/70">Your weekend could look like</p>
            <p className="mt-1 text-xl font-bold italic leading-snug text-ink">“{result.weekend}”</p>
            {(() => {
              const used = [
                ['Exchange rate', c.life.perINR],
                ['Price level', c.life.costIndex],
                ['Work week', c.metrics.workHours],
                ['Paid holidays', c.metrics.paidLeave],
                ['Rent share', c.life.rentShare],
                ['Commute', c.metrics.commuteMinutes],
              ] as const;
              const est = used.filter(([, st]) => st.isSample).map(([l]) => l.toLowerCase());
              return (
                <details className="mt-4 text-sm text-ink/80">
                  <summary className="cursor-pointer font-bold text-ink">Where these numbers come from</summary>
                  <ul className="mt-2 space-y-1">
                    {used.map(([label, st]) => (
                      <li key={label}>
                        <span className="font-bold text-ink">{label}:</span>{' '}
                        {st.isSample ? (
                          <>
                            <span className="sample-tag ml-0 mr-1" title="Editorial estimate: no official statistic yet">est.</span>editorial estimate
                          </>
                        ) : (
                          <>
                            {st.kind === 'live' && <span className="mr-1 rounded bg-ink px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-sun">live</span>}
                            {st.source}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  {est.length > 0 && <p className="mt-2">The {est.join(', ')} figures are estimates. Treat the result as a conversation starter, not financial advice.</p>}
                </details>
              );
            })()}
          </BoardingPass>
        </motion.div>
        </PrintReveal>

        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={download} disabled={busy} className="btn btn-sun">
            <span aria-hidden>⬇</span> {busy ? 'Printing…' : 'Download story card'}
          </button>
          <button onClick={tryAnother} className="btn btn-ghost">
            <span aria-hidden>🎲</span> Try another country
          </button>
          <button onClick={() => setEditing(true)} className="btn btn-ghost">
            Edit my numbers
          </button>
        </div>

        <div className="mt-8">
          <p className="kicker text-sun">Or pick a destination</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {options.map((o) => (
              <li key={o.slug}>
                <Link href={`/your-life/${o.slug}`} className="chip text-cream" aria-current={o.slug === slug ? 'true' : undefined}>
                  <Flag slug={o.slug} size={18} /> {o.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-cream/85">
          Curious why?{' '}
          <Link href={`/countries/${c.slug}`} className="font-semibold text-sun underline underline-offset-4">
            See everyday life in {c.name} →
          </Link>
        </p>
      </div>
    );
  }

  /* ------------------------------- Form ------------------------------- */
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const destC = options.find((o) => o.slug === dest);
  return (
    <>
    <PrintingOverlay show={printing} dest={destC && { slug: destC.slug, name: destC.name, airport: destC.airport }} />
    <form onSubmit={submit} className="checkin mx-auto max-w-3xl overflow-hidden rounded-[30px] border-[3px] border-ink" noValidate data-rv="up" data-section="life-form">
      <div className="checkin-head flex items-center justify-between gap-3 px-5 py-4 text-ink sm:px-8">
        <p className="chunk text-2xl sm:text-3xl">Check-in desk</p>
        <p className="hidden items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] sm:flex">
          <span className="rounded-full bg-sun px-2 py-1 ring-2 ring-ink">1 Money</span>
          <span className="rounded-full bg-sky px-2 py-1 ring-2 ring-ink">2 Time</span>
          <span className="rounded-full bg-violet px-2 py-1 ring-2 ring-ink">3 Where</span>
        </p>
      </div>
      <div className="space-y-4 p-3 sm:space-y-5 sm:p-6">
        <Lane n={1} title="Your money" sub="Your monthly pay and rent. Put 0 if you pay no rent." color="linear-gradient(135deg,#FFB72B,#FFC93C)" tilt={-0.4}>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-8">
            <Money label="I earn" placeholder="60,000" value={form.salary} onChange={(v) => setForm({ ...form, salary: v })} />
            <Money label="I pay in rent" placeholder="20,000" value={form.rent} onChange={(v) => setForm({ ...form, rent: v })} />
          </div>
        </Lane>

        <Lane n={2} title="Your time" sub="Drag to match your real week." color="linear-gradient(135deg,#8A5CF6,#7BDCF7)" tilt={0.4}>
          <div className="space-y-5 sm:space-y-7">
            <Slider label="Work hours a week" unit="hrs" min={10} max={90} value={form.hours} onChange={(v) => setForm({ ...form, hours: v })} mood={hoursMood} />
            <Slider label="Commute a day, both ways" unit="min" min={0} max={240} step={5} value={form.commute} onChange={(v) => setForm({ ...form, commute: v })} mood={commuteMood} />
            <label className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-ink/75">Flying from</span>
              <input className="h-11 w-48 rounded-full border-[3px] border-ink bg-paper px-4 font-bold text-ink placeholder:font-normal placeholder:text-ink/40 focus:outline-none" type="text" autoComplete="address-level2" placeholder="Delhi" value={form.city} onChange={set('city')} maxLength={30} />
              <span className="text-sm font-semibold text-ink/60">optional, printed on your pass</span>
            </label>
          </div>
        </Lane>

        <fieldset className="lane rounded-[22px] border-[3px] border-ink p-4 text-ink sm:rounded-[24px] sm:p-5" style={{ background: 'linear-gradient(135deg,#FFC9A8,#CDB4FF)', transform: 'rotate(-0.3deg)' }}>
          <legend className="sr-only">Where to?</legend>
          <div className="flex items-center gap-3">
            <span className="chunk flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-base text-sun sm:h-10 sm:w-10 sm:text-lg">3</span>
            <div>
              <p className="chunk text-xl leading-none sm:text-2xl">Where to?</p>
              <p className="mt-1 text-xs font-semibold text-ink/70 sm:text-sm">Pick a destination.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {options.map((o) => {
              const on = dest === o.slug;
              return (
                <button
                  key={o.slug}
                  type="button"
                  onClick={() => setDest(o.slug)}
                  aria-pressed={on}
                  data-track={`life-destination:${o.slug}`}
                  className={`group flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2 text-[12px] font-bold leading-tight transition-all duration-150 ${on ? '-translate-y-1 border-ink bg-ink !text-sun shadow-[0_4px_0_rgba(0,0,0,.35)]' : 'border-transparent text-ink hover:border-ink/40 hover:bg-white/30'}`}
                >
                  <Flag slug={o.slug} size={32} className={`ring-ink/60 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6 ${on ? 'scale-110' : ''}`} />
                  {o.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="perforation" style={{ ['--notch' as string]: '#0D0F3A' }} />
      <div className="flex flex-wrap items-center gap-4 p-5 sm:px-8">
        <button type="submit" className="print-btn chunk w-full rounded-2xl border-[3px] border-ink px-6 py-3.5 text-lg text-ink sm:w-auto sm:px-7 sm:py-3 sm:text-xl transition-transform hover:-translate-y-1 active:translate-y-0.5 sm:text-2xl">
          Print my boarding pass ✈
        </button>
        <p role="alert" className="font-semibold text-coral">
          {error}
        </p>
        <p className="basis-full text-sm text-cream/75">Your numbers stay in this browser. Nothing is uploaded.</p>
      </div>
    </form>
    </>
  );
}
