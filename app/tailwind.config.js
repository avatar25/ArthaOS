/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    fontFamily: {
      sans: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"SF Pro Text"',
        '"SF Pro Display"',
        '"Helvetica Neue"',
        'Helvetica',
        'Arial',
        'sans-serif',
      ],
    },
    extend: {
      colors: {
        brand: {
          50: '#f2f6ff',
          100: '#e0ebff',
          200: '#bed2ff',
          300: '#8aaeff',
          400: '#5683ff',
          500: '#2e5df4',
          600: '#1f45d2',
          700: '#1b38a6',
          800: '#1c3282',
          900: '#1c2d66',
        },
      },
      boxShadow: {
        card: '0 10px 30px -15px rgba(15, 23, 42, 0.25)',
      },
    },
  },
  plugins: [],
}
