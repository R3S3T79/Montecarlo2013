/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        montecarlo: {
          // Colori principali dal logo
          primary: '#4B367C',    // Viola scuro principale
          secondary: '#D32F2F',  // Rosso della fascia
          accent: '#E6C64A',     // Oro del bordo
          neutral: '#B8B8B8',    // Grigio della torre
          light: '#F5F3FF',      // Viola molto chiaro
          dark: '#2D1B4E',       // Viola molto scuro
          
          // Varianti per diversi usi
          purple: {
            50: '#F5F3FF',
            100: '#EDE9FE', 
            200: '#DDD6FE',
            300: '#C4B5FD',
            400: '#A78BFA',
            500: '#8B5CF6',
            600: '#7C3AED',
            700: '#6D28D9',
            800: '#5B21B6',
            900: '#4B367C',
            950: '#2D1B4E'
          },
          red: {
            50: '#FEF2F2',
            100: '#FEE2E2',
            200: '#FECACA',
            300: '#FCA5A5',
            400: '#F87171',
            500: '#EF4444',
            600: '#DC2626',
            700: '#B91C1C',
            800: '#991B1B',
            900: '#D32F2F',
            950: '#7F1D1D'
          },
          gray: {
            50: '#F9FAFB',
            100: '#F3F4F6',
            200: '#E5E7EB',
            300: '#D1D5DB',
            400: '#9CA3AF',
            500: '#6B7280',
            600: '#4B5563',
            700: '#374151',
            800: '#1F2937',
            900: '#B8B8B8',
            950: '#111827'
          },
          gold: {
            50: '#FFFBEB',
            100: '#FEF3C7',
            200: '#FDE68A',
            300: '#FCD34D',
            400: '#FBBF24',
            500: '#F59E0B',
            600: '#D97706',
            700: '#B45309',
            800: '#92400E',
            900: '#E6C64A',
            950: '#451A03'
          }
        }
      },
      backgroundImage: {
        'gradient-montecarlo': 'linear-gradient(135deg, #D32F2F 0%, #B8B8B8 100%)',
        'gradient-montecarlo-light': 'linear-gradient(135deg, #bfb9b9 0%, #6B7280 100%)',
        'gradient-gold': 'linear-gradient(135deg, #E6C64A 0%, #F59E0B 100%)',
      },
      boxShadow: {
        'montecarlo': '0 4px 14px 0 rgba(211, 47, 47, 0.15)',
        'montecarlo-lg': '0 10px 25px -3px rgba(211, 47, 47, 0.2)',
        'gold': '0 4px 14px 0 rgba(230, 198, 74, 0.25)',
      }
    },
  },
  plugins: [],
};