/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        odoo: {
          primary: '#714B67',
          'primary-hover': '#5d3d54',
          'primary-light': '#f7f2f5',
          gold: '#E4A900',
          'gold-hover': '#cc9700',
          'gold-light': '#fdf9ec',
          secondary: '#017E84',
          'secondary-hover': '#01666b',
          'secondary-light': '#edf7f7',
          gray: '#8F8F8F',
          border: '#e2e5e9',
          surface: '#F8F9FA',
          black: '#000000',
          white: '#FFFFFF',
        }
      }
    },
  },
  plugins: [],
}
