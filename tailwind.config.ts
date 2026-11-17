import type { Config } from 'tailwindcss';

// Brand palette from the Passport Stories badge. Use these names everywhere
// (bg-ink, text-cream, ...) instead of raw hex values.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B1F5E', // deep indigo: base, ring, dark surfaces
        night: 'rgb(var(--night) / <alpha-value>)', // darker shade of ink for the page background
        sun: '#FFB703',
        tang: '#FB8500',
        coral: '#F27B35', // was red; the owner asked for no red, so this is now a warm orange
        cream: 'rgb(var(--cream) / <alpha-value>)',
        teal: '#06A77D',
        sky: '#4CC9F0',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        violet: '#B693FF', // supporting accents added in v7
      },
      fontFamily: {
        chunk: ['"Bowlby One"', '"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans Variable"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        ticket: '0 18px 40px -18px rgba(0,0,0,.55)',
      },
    },
  },
  plugins: [],
};
export default config;
