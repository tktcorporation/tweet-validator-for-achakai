/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#14B8A6', // Vibrant Teal
        'brand-secondary': '#FF7F50', // Coral
        'brand-accent': '#F97316', // Bright Orange
        'neutral-light': '#F3F4F6', // Cool Gray 100
        'neutral-medium': '#9CA3AF', // Cool Gray 400
        'neutral-dark': '#374151', // Cool Gray 700
        'neutral-ultralight': '#EFF6FF', // Effectively a very light gray/blue tint
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-fade': 'pulse-fade 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-fade': {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.7, transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
};
