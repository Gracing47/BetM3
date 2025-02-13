/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1BB775",      /* Main brand/action color */
        "primary-dark": "#158F5C", /* Darker variant for hover states */
        disableCard: "#C8D0CB",  /* Disabled state */
        primaryLight: "#CFF2E5", /* Light variant */
        secondary: "#DFFC70"     /* Accent color */
      },
    },
  },
  plugins: [],
};
