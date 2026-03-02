import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './contexts/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Main app colors
        primary: '#135bec',
        'primary-hover': '#1d64f2',
        'background-light': '#f6f6f8',
        'background-dark': '#101622',
        'neutral-dark': '#1a1022',
        glass: 'rgba(26, 16, 34, 0.7)',
        // Inventar brand colors (brand-*)
        brand: {
          50:  '#eff5ff',
          100: '#dce8ff',
          200: '#c0d5ff',
          300: '#93b8ff',
          400: '#5f90ff',
          500: '#3563fa',
          600: '#135bec',
          700: '#1148c8',
          800: '#143ba1',
          900: '#16357f',
          950: '#111f4d',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}

export default config
