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
    },
  },
  plugins: [],
}

export default config
