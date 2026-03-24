const { colors, borderRadius } = require("@coloc/ui/tokens");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      borderRadius: {
        card: borderRadius.card,
        pill: borderRadius.pill,
        button: borderRadius.button,
        input: borderRadius.input,
      },
    },
  },
  plugins: [],
}
