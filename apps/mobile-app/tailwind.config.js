// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./App.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'papola-blue': '#1F29DE',
        'papola-blue-80': '#4C54E5',
        'papola-blue-60': '#797FEC',
        'papola-blue-40': '#A5A9F2',
        'papola-blue-20': '#D2D4F8',
        'papola-green': '#63c132',
        'papola-green-80': '#82CD5B',
        'papola-green-20': '#E0F3D6',
      },
    },
  },
  plugins: [],
}
