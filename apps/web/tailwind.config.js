/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rose: '#D4A0A0',
        gold: '#C9A96E', 
        cream: '#FAF7F2',
        dark: '#2D2D2D',
        sage: '#B7C4B0',
      },
    },
  },
  plugins: [],
}
