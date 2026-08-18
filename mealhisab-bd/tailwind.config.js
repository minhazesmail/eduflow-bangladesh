/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#f0fdf4', 500: '#16a34a', 600: '#15803d', 700: '#166534' },
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem' },
      boxShadow: { soft: '0 8px 30px rgba(15, 23, 42, 0.08)' },
    },
  },
  plugins: [],
}
