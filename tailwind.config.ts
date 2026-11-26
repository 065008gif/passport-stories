import type { Config } from 'tailwindcss';

// Brand palette from the Passport Stories badge. Use these names everywhere
// (bg-ink, text-cream, ...) instead of raw hex values.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F2A44', // deep sea navy: text on bright colours and small dark details
        night: 'rgb(var(--night) / <alpha-value>)', // the page background: warm ivory
        sun: '#FFC233', // sunshine yellow
        tang: '#FF8A4C', // soft orange
        coral: '#FF6B5B', // coral
        cream: 'rgb(var(--cream) / <alpha-value>)', // main text colour: deep sea navy
        paper: '#FFFFFF', // cards and tickets
        teal: '#12B5A6', // turquoise
        sky: '#1AA3CF', // sky blue
        panel: 'rgb(var(--panel) / <alpha-value>)',
        violet: '#FFC9A8', // peach (kept the old name so every page picks it up)
        peach: '#FFE3D3',
        ivory: '#FFF8EF',
        magenta: '#FF6B5B',
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
