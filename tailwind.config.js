/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: { 50: '#eef3fb', 100: '#d9e4f5', 200: '#b3c9ea', 300: '#7fa2d8', 400: '#4c78c0', 500: '#2d5aa3', 600: '#1f4482', 700: '#183567', 800: '#122850', 900: '#0b1a36', 950: '#07111f' },
        teal: { 50: '#e8f8f6', 100: '#c5eeea', 200: '#93ddd5', 300: '#5cc6bc', 400: '#2faa9f', 500: '#1b8f86', 600: '#14726c', 700: '#115b57', 800: '#0f4946', 900: '#0c3a38' },
        amber2: { 400: '#f2b84b', 500: '#e5a22b' },
      },
      fontFamily: {
        sans: ['"Source Sans 3"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'ui-serif', 'serif'],
      },
    },
  },
  plugins: [],
};
