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
        loyaltyGold: '#f97316', // Vibrant logo swoosh orange
        indigo: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae2fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9', // Logo cyan/blue
          600: '#2563eb', // Logo primary blue
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0f172a',
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
