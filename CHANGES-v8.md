# v8 draft: what changed since v7

1. **Boarding pass printer.** After "Print my boarding pass", a printer animation runs while the result loads, then the pass feeds out of the printer. (`components/life/PrintMachine.tsx`)
2. **Hero globe can be spun.** On the home page's first screen the globe still turns by itself, and can now be grabbed and spun with the mouse or a finger; it eases back into its slow turn. (`components/flight/FlightHome.tsx`)
3. **"Your turn to take off" section.** Replaces "Now make it about you": a teal departures band with four gate boarding passes and a plane hopping between them. (`components/home/BoardingGates.tsx`)
4. **Real data and backend.** Live API figures (exchange rates, cost of living, school age) fetched on every deploy; checked figures with sources (work week, paid holidays, household size, home ownership); remaining estimates tagged "est.". Fact spam limits, feature usage panels and CSV export in /admin, Vercel Analytics and Speed Insights, new GA4 events. See DATA.md, BACKEND.md, ANALYTICS.md.
5. **Check-in desk redesign.** Quick-pick amount buttons removed; money and time are now two clean coloured lanes with big numbers.

## Round 2 (colour pass)

6. **"Your passport" button** in the header now looks like a navy passport booklet with a gold globe emblem, "Your passport" and the stamp count.
7. **Check-in desk** is bright: sunset header, yellow money counter, sky-blue time counter, violet destination counter, dark ink text, big orange print button.
8. **Boarding pass result** is bright: sunset route band, six colourful stat tiles, sky-blue stub.
9. **Printer animation** is a yellow-orange printer on a sunburst, printing a colourful pass.
10. **"Your turn to take off"** band is now a yellow-orange sunburst with dark text; the cream gate cards stay.

## Round 3 (final polish)

11. **Home intro**: new question-led description; "Scroll for a one-minute flight…" always shown; the DEL/NRT flight tracker sits under the globe on laptops so it never overlaps the text.
12. **Play Zone** replaces "Arcade" everywhere.
13. **Your passport button**: a mini passport with the Passport Stories sunset on its cover, an orange stamp showing the count (0/20), "Your passport" and "N stamps so far", inside a cream outline. The header is sticky, so it stays visible on every page and while scrolling.
