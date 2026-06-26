/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a5c3a',
          50:  '#f0f8f4',
          100: '#d1ead9',
          200: '#a3d5b3',
          300: '#70ba8a',
          400: '#3e9e61',
          500: '#2e8f4e',
          600: '#237540',
          700: '#1a5c3a',
          800: '#134530',
          900: '#0c2e20',
        },
        accent: {
          DEFAULT: '#c1440e',
          50:  '#fff4f0',
          100: '#ffddd0',
          400: '#e8712e',
          500: '#c1440e',
          600: '#a33509',
        },
        wheat: '#d4a017',
      },
    },
  },
  plugins: [],
}
