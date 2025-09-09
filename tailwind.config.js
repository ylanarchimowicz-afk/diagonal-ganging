/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,jsx,ts,tsx}",          // < archivos en la raíz (index.tsx, etc.)
    "./src/**/*.{js,jsx,ts,tsx}"    // < todo lo de /src
  ],
  theme: { extend: {} },
  plugins: [],
};
