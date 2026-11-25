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
        display: ['Outfit', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#FF4D24',
          hover: '#E83E16',
          soft: '#FFF1ED',
        },
        brand: {
          50: '#FFF1ED',
          100: '#FFE0D6',
          500: '#FF4D24',
          600: '#E83E16',
          700: '#C9320F',
        },
        dark: {
          bg: '#0A0A0C',
          card: '#131316',
          border: '#26262C',
          hover: '#1B1B20',
          text: '#F5F5F7',
          muted: '#989BA6'
        }
      }
    },
  },
  plugins: [],
}
