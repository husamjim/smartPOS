/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Cairo', 'sans-serif'],
      },
      colors: {
        darkBg: '#090d16',
        darkCard: 'rgba(17, 24, 39, 0.7)',
        neonBlue: '#3b82f6',
        neonGreen: '#10b981',
        loyaltyGold: '#d97706',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
