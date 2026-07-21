import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        cairo: ['Cairo', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#3B5FD4',
          600: '#1841A0',   // primary brand blue
          700: '#122E78',   // dark brand (sidebar)
          800: '#0D2260',
          900: '#091848',
        },
        sidebar: '#122E78',  // Samnan brand deep blue
      },
      // Soft, layered shadows — every existing shadow-sm/shadow card upgrades at once
      boxShadow: {
        sm: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        DEFAULT: '0 1px 3px 0 rgb(15 23 42 / 0.06), 0 4px 12px -2px rgb(15 23 42 / 0.08)',
        md: '0 2px 4px -1px rgb(15 23 42 / 0.05), 0 8px 20px -4px rgb(15 23 42 / 0.10)',
        lg: '0 4px 6px -2px rgb(15 23 42 / 0.05), 0 16px 32px -8px rgb(15 23 42 / 0.12)',
        xl: '0 8px 12px -4px rgb(15 23 42 / 0.06), 0 24px 48px -12px rgb(15 23 42 / 0.16)',
        glow: '0 0 0 1px rgb(24 65 160 / 0.08), 0 8px 24px -6px rgb(24 65 160 / 0.25)',
        'brand-btn': '0 1px 2px 0 rgb(9 24 72 / 0.25), 0 4px 12px -2px rgb(24 65 160 / 0.35)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96) translateY(6px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out both',
        'fade-up': 'fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
