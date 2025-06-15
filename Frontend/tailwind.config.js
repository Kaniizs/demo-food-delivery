/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'Kadwa': ['Kadwa', 'sans-serif'],
      },
      colors: {
        'custom-green': '#3CF464',
      }
    }
  },
  plugins: [],
}