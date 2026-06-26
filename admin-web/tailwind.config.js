/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'farm-green': {
          50: '#f0f7f3',
          100: '#dcede3',
          200: '#bcdbc9',
          300: '#8fc1a7',
          400: '#5fa181',
          500: '#3d8463',
          600: '#2d6a4e',
          700: '#255540',
          800: '#1f4434',
          900: '#1a3c2b',
          950: '#0d1f17',
        },
      },
    },
  },
  plugins: [],
}
