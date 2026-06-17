/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "hsl(221, 83%, 53%)",
          dark: "hsl(221, 83%, 43%)",
          light: "hsl(221, 83%, 93%)",
          glow: "rgba(37, 99, 235, 0.15)",
        },
        accent: {
          DEFAULT: "hsl(180, 100%, 35%)",
          glow: "rgba(13, 148, 136, 0.14)",
        },
        success: "hsl(142, 71%, 45%)",
        warning: "hsl(38, 92%, 50%)",
        danger: "hsl(0, 84%, 60%)",
        slate: {
          950: "var(--color-slate-950)",
          900: "var(--color-slate-900)",
          850: "var(--color-slate-850)",
          800: "var(--color-slate-850)",
          750: "var(--color-slate-750)",
          700: "var(--color-slate-750)",
          650: "var(--color-slate-650)",
          600: "var(--color-slate-600)",
          550: "var(--color-slate-550)",
          500: "var(--color-slate-550)",
          450: "var(--color-slate-450)",
          400: "var(--color-slate-450)",
          350: "var(--color-slate-350)",
          300: "var(--color-slate-300)",
          250: "var(--color-slate-250)",
          200: "var(--color-slate-200)",
          100: "var(--color-slate-100)",
          50: "var(--color-slate-50)",
        }
      },
      borderRadius: {
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        sm: "0 2px 12px rgba(15, 23, 42, 0.04)",
        md: "0 8px 32px rgba(15, 23, 42, 0.06)",
        lg: "0 16px 64px rgba(15, 23, 42, 0.1)",
        primary: "0 0 20px rgba(37, 99, 235, 0.12)",
        accent: "0 0 20px rgba(13, 148, 136, 0.1)",
      },
      fontFamily: {
        space: ["Space Grotesk", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
        outfit: ["Outfit", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      }
    },
  },
  plugins: [],
}
