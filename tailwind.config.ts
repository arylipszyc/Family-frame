import type { Config } from 'tailwindcss'

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'frame-cream':    '#F5F0E8',
        'frame-amber':    '#C8956C',
        'frame-sepia':    '#8B6F5E',
        'frame-charcoal': '#2C2420',
        'frame-night':    '#1A1210',
        'frame-overlay':  'rgba(28, 18, 12, 0.72)',
        'frame-paper':    'rgba(245, 235, 210, 0.06)',
      },
      fontFamily: {
        'kiosk-serif': ['Playfair Display', 'serif'],
        'kiosk-sans':  ['Inter', 'sans-serif'],
      },
      fontSize: {
        'kiosk-yiddish':         ['clamp(40px, 4vw, 64px)',   { lineHeight: '1.2' }],
        'kiosk-birthday':        ['clamp(28px, 3vw, 42px)',   { lineHeight: '1.3' }],
        'kiosk-date':            ['clamp(22px, 2.5vw, 32px)', { lineHeight: '1.4' }],
        'kiosk-transliteration': ['24px',                      { lineHeight: '1.5' }],
        'welcome-title':         ['64px',                      { lineHeight: '1.1' }],
        'welcome-message':       ['28px',                      { lineHeight: '1.5' }],
        'welcome-prompt':        ['22px',                      { lineHeight: '1.4' }],
      },
    },
  },
  plugins: [],
} satisfies Config
