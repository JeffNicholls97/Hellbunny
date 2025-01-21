/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./**/*.{liquid,json}'],
  theme: {
    extend: {},
  },
  corePlugins: {
    preflight: false,
  },
  prefix: 'tw-',
  plugins: [],
}

