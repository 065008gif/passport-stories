import type { Config } from 'tailwindcss';

// Sundowner palette (amber, tangerine, coral, rose, twilight violet, dusk plum). Use these names everywhere
// (bg-ink, text-cream, ...) instead of raw hex values.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2B1B3D', // dusk plum: text on bright colours and small dark details
        night: 'rgb(var(--night) / <alpha-value>)', // the page background: warm ivory
        sun: '#FFB72B', // sundowner amber
        tang: '#FF7A45', // tangerine
        coral: '#FF5A6E', // coral rose
        cream: 'rgb(var(--cream) / <alpha-value>)', // main text colour: deep sea navy
        paper: '#FFFFFF', // cards and tickets
        teal: '#E84A7F', // dusk rose (sundowner palette)
        sky: '#8A5CF6', // twilight violet
        panel: 'rgb(var(--panel) / <alpha-value>)',
        violet: '#FFC2A8', // peach (kept the old name so every page picks it up)
        peach: '#FFDCC8',
        ivory: '#FFF1E6',
        magenta: '#E84A7F',
      },
      fontFamily: {
        chunk: ['"Bowlby One"', '"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        ui: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        ticket: '0 18px 40px -18px rgba(31,42,68,.35)',
      },
    },
  },
  plugins: [],
};
export default config;
