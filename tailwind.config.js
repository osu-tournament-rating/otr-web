/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      backgroundColor: {
        'default-light': '#ffffff', // default background color for light mode
        'default-dark': '#1a1a1a',  // default background color for dark mode
      },
      textColor: {
        'default-light': '#333333', // default text color for light mode
        'default-dark': '#eaeaea',  // default text color for dark mode
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'],
      },
    }
  },
  plugins: [],
}