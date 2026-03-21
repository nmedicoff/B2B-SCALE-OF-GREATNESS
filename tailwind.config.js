/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 10px 30px -18px rgba(20, 20, 32, 0.45)"
      }
    }
  },
  plugins: []
};
