/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Ensure these paths match your folder names EXACTLY (case-sensitive)
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
