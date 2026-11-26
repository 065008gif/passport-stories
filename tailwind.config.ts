import type { Config } from 'tailwindcss';

// Brand palette from the Passport Stories badge. Use these names everywhere
// (bg-ink, text-cream, ...) instead of raw hex values.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#24123D', // deep plum: text on bright colours, dark details (Fiesta theme)
        night: 'rgb(var(--night) / <alpha-value>)', // the page background (light warm cream in the Fiesta theme)
        sun: '#FFB703',
        tang: '#FF7A1A',
        coral: '#FF4F7B', // Fiesta magenta
        cream: 'rgb(var(--cream) / <alpha-value>)', // main text colour (deep plum in the Fiesta theme)
        paper: '#FFFFFF', // cards and tickets
        teal: '#06A77D',
        sky: '#6C4CF5', // Fiesta electric violet (kept the old name so every page picks it up)
        panel: 'rgb(var(--panel) / <alpha-value>)',
        violet: '#B693FF', // soft lavender accent
        magenta: '#FF4F7B',
      },
      fontFamily: {
        chunk: ['"Bowlby One"', '"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        ui: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        ticket: '0 18px 40px -18px rgba(36,18,61,.35)',
      },
    },
  },
  plugins: [],
};
export default config;
